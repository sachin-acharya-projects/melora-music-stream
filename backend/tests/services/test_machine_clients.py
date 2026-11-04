import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps.auth import require_machine_scopes
from app.db.models.machine_client import MachineClientModel
from app.services.auth import AuthService
from app.services.machine_clients import MachineClientService


def _create_machine(db, owner):
    return MachineClientService.create(
        db,
        owner,
        name="Home automation",
        service_identity="urn:melora:home-automation",
        scopes=["profile:read", "library:read"],
        expires_in_days=30,
    )


def test_machine_client_has_independent_identity_and_hashed_secret(db, test_user) -> None:
    created = _create_machine(db, test_user)
    record = db.query(MachineClientModel).one()

    assert record.service_identity == "urn:melora:home-automation"
    assert record.client_secret_hash != created["client_secret"]
    assert "user_id" not in created


def test_machine_client_credentials_issue_machine_token(db, test_user) -> None:
    created = _create_machine(db, test_user)
    tokens = MachineClientService.issue_access_token(
        db,
        str(created["client_id"]),
        str(created["client_secret"]),
    )

    payload = AuthService.decode_token(str(tokens["access_token"]))
    assert payload is not None
    assert payload["credential_type"] == "machine"
    assert payload["sub"] == "urn:melora:home-automation"
    assert "user_id" not in payload


def test_machine_client_requires_explicit_user_data_grant(db, test_user) -> None:
    _create_machine(db, test_user)
    client = db.query(MachineClientModel).one()

    with pytest.raises(HTTPException) as exc:
        MachineClientService.require_user_grant(
            db, client, test_user.id, ["profile:read"]
        )
    assert exc.value.status_code == 403

    grant = MachineClientService.grant_user_access(
        db,
        test_user,
        client.id,
        test_user.id,
        ["profile:read"],
    )
    assert grant.scopes == ["profile:read"]
    assert MachineClientService.require_user_grant(
        db, client, test_user.id, ["profile:read"]
    ) == {"profile:read"}


def test_regular_user_cannot_grant_machine_access_to_another_user(
    db, test_user, admin_user
) -> None:
    _create_machine(db, test_user)
    client = db.query(MachineClientModel).one()

    with pytest.raises(HTTPException) as exc:
        MachineClientService.grant_user_access(
            db,
            test_user,
            client.id,
            admin_user.id,
            ["profile:read"],
        )
    assert exc.value.status_code == 403


def test_machine_client_deactivation_invalidates_credentials(db, test_user) -> None:
    created = _create_machine(db, test_user)
    record = db.query(MachineClientModel).one()
    MachineClientService.deactivate(db, test_user, record.id)

    with pytest.raises(HTTPException) as exc:
        MachineClientService.issue_access_token(
            db,
            str(created["client_id"]),
            str(created["client_secret"]),
        )
    assert exc.value.status_code == 401


def test_machine_token_uses_machine_scope_dependency(db, test_user) -> None:
    created = _create_machine(db, test_user)
    tokens = MachineClientService.issue_access_token(
        db,
        str(created["client_id"]),
        str(created["client_secret"]),
    )
    dependency = require_machine_scopes("profile:read")
    principal = dependency(
        credentials=HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=str(tokens["access_token"]),
        ),
        db=db,
    )

    assert principal.client.service_identity == "urn:melora:home-automation"
    assert principal.scopes == {"profile:read"}

    with pytest.raises(HTTPException) as exc:
        require_machine_scopes("player:control")(
            credentials=HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=str(tokens["access_token"]),
            ),
            db=db,
        )
    assert exc.value.status_code == 403
