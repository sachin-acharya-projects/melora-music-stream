from typing import Any

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, SessionDep
from app.core.scopes import serialize_scope_catalog
from app.core.webhook_events import serialize_webhook_events
from app.schemas.machine_clients import (
    MachineClientCreate,
    MachineClientCreated,
    MachineClientResponse,
    MachineUserGrantCreate,
    MachineUserGrantResponse,
)
from app.schemas.oauth_applications import (
    OAuthApplicationCreate,
    OAuthApplicationResponse,
)
from app.schemas.webhooks import (
    WebhookSecretResponse,
    WebhookSubscriptionCreate,
    WebhookSubscriptionCreated,
    WebhookSubscriptionResponse,
)
from app.schemas.personal_access_tokens import (
    PersonalAccessTokenCreate,
    PersonalAccessTokenCreated,
    PersonalAccessTokenResponse,
)
from app.services.machine_clients import MachineClientService
from app.services.oauth_applications import OAuthApplicationService
from app.services.personal_access_tokens import PersonalAccessTokenService
from app.services.webhooks import WebhookSubscriptionService

router = APIRouter()


@router.get("/scopes", response_model=list[dict[str, str | bool]])
def list_api_scopes() -> list[dict[str, str | bool]]:
    """Return the canonical scope catalog for developer consent screens."""
    return serialize_scope_catalog()


@router.post(
    "/tokens",
    response_model=PersonalAccessTokenCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_personal_access_token(
    data: PersonalAccessTokenCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Create a PAT and return its raw value exactly once."""
    return PersonalAccessTokenService.create(
        db,
        user,
        name=data.name,
        scopes=data.scopes,
        expires_in_days=data.expires_in_days,
    )


@router.get("/tokens")
def list_personal_access_tokens(
    user: CurrentUser,
    db: SessionDep,
) -> list[PersonalAccessTokenResponse]:
    """List the caller's token metadata without exposing token values or hashes."""
    return [
        PersonalAccessTokenResponse.model_validate(record)
        for record in PersonalAccessTokenService.list_for_user(db, user)
    ]


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_personal_access_token(
    token_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    """Revoke one of the caller's personal access tokens."""
    PersonalAccessTokenService.revoke(db, user, token_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/applications",
    response_model=OAuthApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_oauth_application(
    data: OAuthApplicationCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Register an OAuth application; confidential secrets are returned once."""
    return OAuthApplicationService.create(
        db,
        user,
        name=data.name,
        description=data.description,
        redirect_uris=data.redirect_uris,
        allowed_scopes=data.allowed_scopes,
        is_confidential=data.is_confidential,
    )


@router.get("/applications")
def list_oauth_applications(
    user: CurrentUser,
    db: SessionDep,
) -> list[OAuthApplicationResponse]:
    """List the current user's OAuth applications without client secrets."""
    return [
        OAuthApplicationResponse.model_validate(app)
        for app in OAuthApplicationService.list_for_owner(db, user)
    ]


@router.delete("/applications/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_oauth_application(
    app_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    """Deactivate an OAuth application owned by the current user."""
    OAuthApplicationService.deactivate(db, user, app_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/machine-clients",
    response_model=MachineClientCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_machine_client(
    data: MachineClientCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Create an independent machine identity; its secret is shown once."""
    return MachineClientService.create(
        db,
        user,
        name=data.name,
        service_identity=data.service_identity,
        scopes=data.scopes,
        expires_in_days=data.expires_in_days,
    )


@router.get("/machine-clients")
def list_machine_clients(
    user: CurrentUser,
    db: SessionDep,
) -> list[MachineClientResponse]:
    return [
        MachineClientResponse.model_validate(client)
        for client in MachineClientService.list_for_owner(db, user)
    ]


@router.delete("/machine-clients/{client_record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_machine_client(
    client_record_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    MachineClientService.deactivate(db, user, client_record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/machine-clients/{client_record_id}/user-grants",
    status_code=status.HTTP_201_CREATED,
)
def grant_machine_user_access(
    client_record_id: str,
    data: MachineUserGrantCreate,
    user: CurrentUser,
    db: SessionDep,
) -> MachineUserGrantResponse:
    grant = MachineClientService.grant_user_access(
        db,
        user,
        client_record_id,
        data.user_id,
        data.scopes,
    )
    return MachineUserGrantResponse.model_validate(grant)


@router.get(
    "/machine-clients/{client_record_id}/user-grants",
)
def list_machine_user_grants(
    client_record_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> list[MachineUserGrantResponse]:
    return [
        MachineUserGrantResponse.model_validate(grant)
        for grant in MachineClientService.list_user_grants(
            db, user, client_record_id
        )
    ]


@router.delete(
    "/machine-clients/{client_record_id}/user-grants/{grant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_machine_user_grant(
    client_record_id: str,
    grant_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    MachineClientService.revoke_user_grant(
        db, user, client_record_id, grant_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)



@router.get("/webhook-events")
def list_webhook_events() -> list[dict[str, str]]:
    """Return the supported webhook event types and their descriptions."""
    return serialize_webhook_events()


@router.post(
    "/webhooks",
    response_model=WebhookSubscriptionCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_webhook_subscription(
    data: WebhookSubscriptionCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Create a webhook subscription and return its signing secret once."""
    return WebhookSubscriptionService.create(
        db,
        user,
        name=data.name,
        endpoint_url=data.endpoint_url,
        events=data.events,
    )


@router.get("/webhooks")
def list_webhook_subscriptions(
    user: CurrentUser,
    db: SessionDep,
) -> list[WebhookSubscriptionResponse]:
    """List the caller's webhook subscriptions without their signing secrets."""
    return [
        WebhookSubscriptionResponse.model_validate(subscription)
        for subscription in WebhookSubscriptionService.list_for_user(db, user)
    ]


@router.post(
    "/webhooks/{subscription_id}/rotate-secret",
    response_model=WebhookSecretResponse,
)
def rotate_webhook_secret(
    subscription_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, str]:
    """Rotate a signing secret; the new value is returned exactly once."""
    return {
        "signing_secret": WebhookSubscriptionService.rotate_secret(
            db, user, subscription_id
        )
    }


@router.delete("/webhooks/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook_subscription(
    subscription_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    WebhookSubscriptionService.delete(db, user, subscription_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
