from pydantic import BaseModel, Field


class YouTubeArtistImport(BaseModel):
    channel_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    thumbnail: str | None = None
