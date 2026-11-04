from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MachineClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    service_identity: str = Field(min_length=3, max_length=128)
    scopes: list[str] = Field(min_length=1)
    expires_in_days: int = Field(default=365, ge=1, le=365)


class MachineClientResponse(BaseModel):
    id: str
    name: str
    service_identity: str
    client_id: str
    scopes: list[str]
    expires_at: datetime
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MachineClientCreated(MachineClientResponse):
    client_secret: str


class MachineUserGrantCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    scopes: list[str] = Field(min_length=1)


class MachineUserGrantResponse(BaseModel):
    id: str
    machine_client_id: str
    user_id: str
    scopes: list[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
