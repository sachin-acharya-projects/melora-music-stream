from pydantic import BaseModel


class LyricLine(BaseModel):
    time: float | None = None
    text: str


class LyricsResponse(BaseModel):
    synced: bool
    lines: list[LyricLine]
    source: str | None = None
