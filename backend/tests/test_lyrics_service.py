import httpx
import pytest

from app.schemas.lyrics import LyricsResponse
from app.services.lyrics import LyricsService


@pytest.fixture(name="lyrics")
def lyrics_service() -> LyricsService:
    return LyricsService()


class TestParseLrc:
    def test_parses_timestamps(self) -> None:
        lines = LyricsService.parse_lrc("[00:12.34]Hello\n[00:15.00]World\n")
        assert lines[0].time == pytest.approx(12.34)
        assert lines[0].text == "Hello"
        assert lines[1].time == pytest.approx(15.0)
        assert lines[1].text == "World"

    def test_stacked_timestamps_repeat_text(self) -> None:
        lines = LyricsService.parse_lrc("[01:00][01:05][01:10]Chorus\n")
        assert len(lines) == 3
        assert all(line.text == "Chorus" for line in lines)
        assert [line.time for line in lines] == [60, 65, 70]

    def test_skips_metadata_tags(self) -> None:
        lines = LyricsService.parse_lrc("[ti:Title]\n[00:01.00]Verse\n")
        assert len(lines) == 1
        assert lines[0].text == "Verse"


class TestGetLyrics:
    def test_lrclib_synced(self, lyrics: LyricsService, monkeypatch) -> None:
        monkeypatch.setattr(
            LyricsService,
            "fetch_lrclib",
            staticmethod(
                lambda title, artist, duration: LyricsResponse(
                    synced=True,
                    lines=[
                        {"time": 1.0, "text": "First"},
                        {"time": 5.0, "text": "Second"},
                    ],
                )
            ),
        )
        monkeypatch.setattr(
            LyricsService, "fetch_ytmusic", lambda self, title, artist: None
        )

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.synced is True
        assert len(result.lines) == 2
        assert result.lines[1].text == "Second"

    def test_ytmusic_fallback_on_lrclib_miss(
        self, lyrics: LyricsService, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            LyricsService, "fetch_lrclib", staticmethod(lambda *a, **k: None)
        )
        monkeypatch.setattr(
            LyricsService,
            "fetch_ytmusic",
            lambda self, title, artist: LyricsResponse(
                synced=False, lines=[{"time": None, "text": "Fallback"}]
            ),
        )

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.synced is False
        assert result.lines[0].text == "Fallback"

    def test_no_lyrics_returns_empty(self, lyrics: LyricsService, monkeypatch) -> None:
        monkeypatch.setattr(
            LyricsService, "fetch_lrclib", staticmethod(lambda *a, **k: None)
        )
        monkeypatch.setattr(
            LyricsService, "fetch_ytmusic", lambda self, title, artist: None
        )

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.lines == []

    def test_lrclib_request_failure_is_graceful(
        self, lyrics: LyricsService, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            httpx,
            "get",
            lambda *a, **k: (_ for _ in ()).throw(httpx.ConnectError("down")),
        )
        monkeypatch.setattr(
            LyricsService, "fetch_ytmusic", lambda self, title, artist: None
        )

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.lines == []
