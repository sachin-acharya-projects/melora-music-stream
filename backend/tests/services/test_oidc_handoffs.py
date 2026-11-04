from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.db.models.oidc_login_handoff import OIDCLoginHandoffModel
from app.services.oidc_handoffs import OIDCLoginHandoffService


def test_handoff_is_hashed_and_can_be_exchanged_once(db, test_user) -> None:
    code = OIDCLoginHandoffService.create(db, test_user.id)

    stored = db.query(OIDCLoginHandoffModel).one()
    assert stored.token_hash != code

    tokens = OIDCLoginHandoffService.exchange(db, code)
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    db.refresh(stored)
    assert stored.consumed_at is not None

    with pytest.raises(HTTPException) as exc:
        OIDCLoginHandoffService.exchange(db, code)

    assert exc.value.status_code == 401


def test_expired_handoff_cannot_be_exchanged(db, test_user) -> None:
    code = OIDCLoginHandoffService.create(db, test_user.id)
    handoff = db.query(OIDCLoginHandoffModel).one()
    handoff.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        OIDCLoginHandoffService.exchange(db, code)

    assert exc.value.status_code == 401
