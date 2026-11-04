from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WebhookSubscriptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    endpoint_url: str = Field(min_length=8, max_length=2048)
    events: list[str] = Field(min_length=1, max_length=50)


class WebhookSubscriptionResponse(BaseModel):
    id: str
    name: str
    endpoint_url: str
    events: list[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookSubscriptionCreated(WebhookSubscriptionResponse):
    signing_secret: str


class WebhookSecretResponse(BaseModel):
    signing_secret: str
