import pytest
from fastapi import HTTPException

from app.services.auth import AuthService


def test_google_login_does_not_implicitly_link_matching_email(db, test_user) -> None:
    with pytest.raises(HTTPException) as exc:
        AuthService.upsert_google_user(
            db,
            google_id="new-google-subject",
            email=test_user.email,
            name="Test User",
        )

    assert exc.value.status_code == 409
    db.refresh(test_user)
    assert test_user.oauth_id is None
    assert test_user.oauth_provider is None


def test_existing_google_identity_still_signs_in(db, test_user) -> None:
    test_user.oauth_provider = "google"
    test_user.oauth_id = "existing-google-subject"
    db.commit()

    user = AuthService.upsert_google_user(
        db,
        google_id="existing-google-subject",
        email=test_user.email,
    )

    assert user.id == test_user.id
