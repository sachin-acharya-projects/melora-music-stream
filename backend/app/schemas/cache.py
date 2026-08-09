from typing import Literal

from pydantic import BaseModel, Field


class CacheInvalidateRequest(BaseModel):
    scope: Literal["search", "stream"]
    key: str = Field(min_length=1, max_length=300)
