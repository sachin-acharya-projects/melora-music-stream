"""Independent machine identities, client credentials, and explicit user grants."""

import hashlib
import hmac
import re
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.scopes import normalize_scopes
from app.db.models.machine_client import MachineClientModel, MachineUserGrantModel
from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService
from app.services.authorization import validate_scope_grant


class MachineClientService:
    @staticmethod
    def create(
        db: Session,
        owner: UserModel,
        *,
        name: str,
        service_identity: str,
        scopes: list[str],
        expires_in_days: int = 365,
    ) -> dict[str, object]:
        """Create a machine identity with its own secret and scope grant."""
        if not name.strip():
            raise HTTPException(status_code=422, detail="Machine client name cannot be blank")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{2,127}", service_identity):
            raise HTTPException(
                status_code=422,
                detail="Service identity must be a stable 3–128 character identifier",
            )
        if not 1 <= expires_in_days <= 365:
            raise HTTPException(
                status_code=422,
                detail="Machine client lifetime must be between 1 and 365 days",
            )
        if (
            db.query(MachineClientModel.id)
            .filter(MachineClientModel.service_identity == service_identity)
            .first()
            is not None
        ):
            raise HTTPException(
                status_code=409,
                detail="A machine client already uses this service identity",
            )
        granted_scopes = validate_scope_grant(owner, scopes)
        client_id = "mlsvc_" + secrets.token_urlsafe(24)
        client_secret = "mlss_" + secrets.token_urlsafe(48)
        record = MachineClientModel(
            owner_user_id=owner.id,
            name=name.strip(),
            service_identity=service_identity,
            client_id=client_id,
            client_secret_hash=hashlib.sha256(client_secret.encode("utf-8")).hexdigest(),
            scopes=sorted(granted_scopes),
            expires_at=datetime.now(UTC) + timedelta(days=expires_in_days),
            is_active=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "id": record.id,
            "name": record.name,
            "service_identity": record.service_identity,
            "client_id": record.client_id,
            "scopes": record.scopes,
            "expires_at": record.expires_at,
            "is_active": record.is_active,
            "created_at": record.created_at,
            "client_secret": client_secret,
        }

    @staticmethod
    def list_for_owner(db: Session, owner: UserModel) -> list[MachineClientModel]:
        return (
            db.query(MachineClientModel)
            .filter(MachineClientModel.owner_user_id == owner.id)
            .order_by(MachineClientModel.created_at.desc())
            .all()
        )

    @staticmethod
    def deactivate(db: Session, owner: UserModel, client_record_id: str) -> None:
        record = (
            db.query(MachineClientModel)
            .filter(
                MachineClientModel.id == client_record_id,
                MachineClientModel.owner_user_id == owner.id,
            )
            .first()
        )
        if record is None:
            raise HTTPException(status_code=404, detail="Machine client not found")
        if record.is_active:
            record.is_active = False
            db.commit()

    @staticmethod
    def issue_access_token(
        db: Session, client_id: str, client_secret: str
    ) -> dict[str, str | int]:
        """Authenticate machine credentials and issue a short-lived service token."""
        record = (
            db.query(MachineClientModel)
            .filter(
                MachineClientModel.client_id == client_id,
                MachineClientModel.is_active.is_(True),
            )
            .first()
        )
        supplied_hash = hashlib.sha256(client_secret.encode("utf-8")).hexdigest()
        if (
            record is None
            or MachineClientService._is_expired(record.expires_at, datetime.now(UTC))
            or not hmac.compare_digest(
                supplied_hash, record.client_secret_hash
            )
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid machine client credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        owner = AuthService.get_user_by_id(db, record.owner_user_id)
        scopes = validate_scope_grant(owner, record.scopes)
        token = AuthService.create_access_token(
            data={
                "sub": record.service_identity,
                "credential_type": "machine",
                "client_id": record.client_id,
                "machine_client_id": record.id,
                "scopes": sorted(scopes),
            },
            expires_delta=timedelta(
                minutes=settings.DELEGATED_ACCESS_TOKEN_EXPIRE_MINUTES
            ),
        )
        return {
            "access_token": token,
            "token_type": "Bearer",
            "expires_in": settings.DELEGATED_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "scope": " ".join(sorted(scopes)),
        }

    @staticmethod
    def validate_access_token(
        db: Session,
        *,
        client_id: str,
        service_identity: str,
        granted_scopes: list[str],
    ) -> tuple[MachineClientModel, frozenset[str]]:
        """Revalidate the machine identity and scope ceiling on every API request."""
        record = (
            db.query(MachineClientModel)
            .filter(
                MachineClientModel.client_id == client_id,
                MachineClientModel.service_identity == service_identity,
                MachineClientModel.is_active.is_(True),
            )
            .first()
        )
        if record is None or MachineClientService._is_expired(
            record.expires_at, datetime.now(UTC)
        ):
            raise HTTPException(status_code=401, detail="Machine identity is inactive or expired")
        owner = AuthService.get_user_by_id(db, record.owner_user_id)
        scopes = validate_scope_grant(owner, granted_scopes)
        if not scopes.issubset(normalize_scopes(record.scopes)):
            raise HTTPException(
                status_code=403,
                detail="Machine token exceeds its registered scope grant",
            )
        return record, scopes

    @staticmethod
    def grant_user_access(
        db: Session,
        owner: UserModel,
        client_record_id: str,
        target_user_id: str,
        scopes: list[str],
    ) -> MachineUserGrantModel:
        """Grant a machine explicit access to one user's data boundary."""
        client = (
            db.query(MachineClientModel)
            .filter(
                MachineClientModel.id == client_record_id,
                MachineClientModel.owner_user_id == owner.id,
                MachineClientModel.is_active.is_(True),
            )
            .first()
        )
        if client is None:
            raise HTTPException(status_code=404, detail="Active machine client not found")
        if target_user_id != owner.id and owner.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Only an administrator can grant a machine access to another user's data",
            )
        target_user = AuthService.get_user_by_id(db, target_user_id)
        granted = validate_scope_grant(target_user, scopes)
        validate_scope_grant(owner, scopes)
        if not granted.issubset(normalize_scopes(client.scopes)):
            raise HTTPException(
                status_code=403,
                detail="User grant exceeds the machine client's registered scopes",
            )
        if not client.is_active or MachineClientService._is_expired(
            client.expires_at, datetime.now(UTC)
        ):
            raise HTTPException(status_code=401, detail="Machine client is inactive or expired")
        grant = (
            db.query(MachineUserGrantModel)
            .filter(
                MachineUserGrantModel.machine_client_id == client.id,
                MachineUserGrantModel.user_id == target_user.id,
            )
            .first()
        )
        if grant is None:
            grant = MachineUserGrantModel(
                machine_client_id=client.id,
                user_id=target_user.id,
                scopes=sorted(granted),
            )
            db.add(grant)
        else:
            grant.scopes = sorted(granted)
        db.commit()
        db.refresh(grant)
        return grant

    @staticmethod
    def list_user_grants(
        db: Session, owner: UserModel, client_record_id: str
    ) -> list[MachineUserGrantModel]:
        client = (
            db.query(MachineClientModel)
            .filter(
                MachineClientModel.id == client_record_id,
                MachineClientModel.owner_user_id == owner.id,
            )
            .first()
        )
        if client is None:
            raise HTTPException(status_code=404, detail="Machine client not found")
        return (
            db.query(MachineUserGrantModel)
            .filter(MachineUserGrantModel.machine_client_id == client.id)
            .order_by(MachineUserGrantModel.created_at.desc())
            .all()
        )

    @staticmethod
    def revoke_user_grant(
        db: Session, owner: UserModel, client_record_id: str, grant_id: str
    ) -> None:
        grant = (
            db.query(MachineUserGrantModel)
            .join(
                MachineClientModel,
                MachineClientModel.id == MachineUserGrantModel.machine_client_id,
            )
            .filter(
                MachineUserGrantModel.id == grant_id,
                MachineClientModel.id == client_record_id,
                MachineClientModel.owner_user_id == owner.id,
            )
            .first()
        )
        if grant is None:
            raise HTTPException(status_code=404, detail="Machine user grant not found")
        db.delete(grant)
        db.commit()

    @staticmethod
    def require_user_grant(
        db: Session,
        client: MachineClientModel,
        target_user_id: str,
        required_scopes: list[str] | tuple[str, ...],
    ) -> frozenset[str]:
        """Require an explicit client-to-user grant for a private user resource."""
        if not client.is_active or MachineClientService._is_expired(
            client.expires_at, datetime.now(UTC)
        ):
            raise HTTPException(status_code=401, detail="Machine client is inactive or expired")
        grant = (
            db.query(MachineUserGrantModel)
            .filter(
                MachineUserGrantModel.machine_client_id == client.id,
                MachineUserGrantModel.user_id == target_user_id,
            )
            .first()
        )
        if grant is None:
            raise HTTPException(
                status_code=403,
                detail="Machine client has no grant for this user's data",
            )
        target_user = AuthService.get_user_by_id(db, target_user_id)
        scopes = validate_scope_grant(target_user, grant.scopes)
        if not scopes.issubset(normalize_scopes(client.scopes)):
            raise HTTPException(
                status_code=403,
                detail="Machine user grant exceeds the client's current scope ceiling",
            )
        required = normalize_scopes(tuple(required_scopes))
        if not required.issubset(scopes):
            raise HTTPException(
                status_code=403,
                detail="Machine user grant does not include the required scopes",
            )
        return scopes

    @staticmethod
    def _is_expired(expires_at: datetime, now: datetime) -> bool:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at <= now
