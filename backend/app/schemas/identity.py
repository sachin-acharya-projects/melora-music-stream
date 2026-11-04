from datetime import datetime

from pydantic import BaseModel


class PublicOIDCProviderResponse(BaseModel):
    id: str
    name: str
    display_name: str
    button_label: str | None
    sort_order: int


class ExternalIdentityResponse(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    email: str | None
    email_verified: bool
    display_name: str | None
    linked_at: datetime
