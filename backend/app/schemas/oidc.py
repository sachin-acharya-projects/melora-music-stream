from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class OIDCProviderCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._-]*$")
    issuer: HttpUrl
    discovery_url: HttpUrl | None = None
    client_id: str = Field(min_length=1, max_length=1024)
    client_secret: str | None = Field(default=None, min_length=1, max_length=4096)
    scopes: list[str] = Field(default_factory=lambda: ["openid", "email", "profile"], min_length=1, max_length=30)
    display_name: str = Field(min_length=1, max_length=120)
    button_label: str | None = Field(default=None, max_length=120)
    enabled: bool = False
    auto_provision: bool = True
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, scopes: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(scope.strip() for scope in scopes))
        if any(not scope or len(scope) > 100 for scope in cleaned):
            raise ValueError("Each OIDC scope must contain 1 to 100 characters")
        if "openid" not in cleaned:
            raise ValueError("The openid scope is required")
        return cleaned


class OIDCProviderUpdate(BaseModel):
    client_id: str | None = Field(default=None, min_length=1, max_length=1024)
    client_secret: str | None = Field(default=None, min_length=1, max_length=4096)
    scopes: list[str] | None = Field(default=None, min_length=1, max_length=30)
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    button_label: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None
    auto_provision: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10000)

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, scopes: list[str] | None) -> list[str] | None:
        if scopes is None:
            return None
        cleaned = list(dict.fromkeys(scope.strip() for scope in scopes))
        if any(not scope or len(scope) > 100 for scope in cleaned) or "openid" not in cleaned:
            raise ValueError("OIDC scopes must be non-empty and include openid")
        return cleaned


class OIDCProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    issuer: str
    discovery_url: str | None
    client_id: str
    scopes: list[str]
    display_name: str
    button_label: str | None
    enabled: bool
    auto_provision: bool
    sort_order: int
    has_client_secret: bool
