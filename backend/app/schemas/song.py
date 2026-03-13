from pydantic import BaseModel


class Song(BaseModel):
    id: str
    title: str
    uploader: str
    thumbnail: str
    duration: int | None = 0


class PlaylistCreate(BaseModel):
    name: str


class PlaylistImport(BaseModel):
    url: str
    name: str | None = None
    id: str | None = None
