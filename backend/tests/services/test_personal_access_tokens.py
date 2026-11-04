import pytest
from fastapi import HTTPException

from app.db.models.personal_access_token import PersonalAccessTokenModel
from app.services.personal_access_tokens import PersonalAccessTokenService


def test_pat_is_hashed_and_authenticated_with_scopes(db, test_user) -> None:
    created = PersonalAccessTokenService.create(
        db,
        test_user,
        name="automation",
        scopes=["profile:read", "library:read"],
        expires_in_days=7,
    )
    raw_token = str(created["token"])
    record = db.query(PersonalAccessTokenModel).one()

    assert record.token_hash != raw_token
    assert raw_token.startswith("mlpat_")

    user, scopes, credential_id = PersonalAccessTokenService.authenticate(db, raw_token)

    assert user.id == test_user.id
    assert scopes == {"profile:read", "library:read"}
    assert credential_id == record.id
    db.refresh(record)
    assert record.last_used_at is not None


def test_pat_is_only_returned_at_creation(db, test_user) -> None:
    created = PersonalAccessTokenService.create(
        db,
        test_user,
        name="one-time",
        scopes=["profile:read"],
    )
    listed = PersonalAccessTokenService.list_for_user(db, test_user)

    assert len(listed) == 1
    assert listed[0].token_hash != created["token"]
    assert not hasattr(listed[0], "token")


def test_revoked_pat_is_rejected(db, test_user) -> None:
    created = PersonalAccessTokenService.create(
        db,
        test_user,
        name="revoked",
        scopes=["profile:read"],
    )
    record = db.query(PersonalAccessTokenModel).one()
    PersonalAccessTokenService.revoke(db, test_user, record.id)

    with pytest.raises(HTTPException) as exc:
        PersonalAccessTokenService.authenticate(db, str(created["token"]))

    assert exc.value.status_code == 401


def test_pat_cannot_be_revoked_by_another_user(db, test_user, admin_user) -> None:
    PersonalAccessTokenService.create(
        db,
        test_user,
        name="owned",
        scopes=["profile:read"],
    )
    record = db.query(PersonalAccessTokenModel).one()

    with pytest.raises(HTTPException) as exc:
        PersonalAccessTokenService.revoke(db, admin_user, record.id)

    assert exc.value.status_code == 404


def test_pat_scopes_cannot_exceed_current_user_role(db, test_user) -> None:
    with pytest.raises(HTTPException) as exc:
        PersonalAccessTokenService.create(
            db,
            test_user,
            name="too-powerful",
            scopes=["admin:users:write"],
        )

    assert exc.value.status_code == 403
