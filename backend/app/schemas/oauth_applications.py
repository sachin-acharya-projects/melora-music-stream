from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OAuthApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    redirect_uris: list[str] = Field(min_length=1, max_length=20)
    allowed_scopes: list[str] = Field(min_length=1)
    is_confidential: bool = True


class OAuthApplicationResponse(BaseModel):
    id: str
    name: str
    description: str | None
    client_id: str
    redirect_uris: list[str]
    allowed_scopes: list[str]
    is_confidential: bool
    is_active: bool
    created_at: datetime
    client_secret: str | None = None

    model_config = ConfigDict(from_attributes=True)
