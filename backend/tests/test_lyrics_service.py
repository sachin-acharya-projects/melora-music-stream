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

    def test_ytmusic_network_error_is_graceful(
        self, lyrics: LyricsService, monkeypatch
    ) -> None:
        class FailingYTMusic:
            def search(self, *args: object, **kwargs: object) -> None:
                raise httpx.ConnectError("unreachable")

            def get_lyrics(self, *args: object, **kwargs: object) -> None:
                raise AssertionError

        monkeypatch.setattr(
            LyricsService, "fetch_lrclib", staticmethod(lambda *a, **k: None)
        )
        monkeypatch.setattr(lyrics, "_get_ytmusic", FailingYTMusic)

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.lines == []

    def test_captions_fallback_used_as_last_resort(
        self, lyrics: LyricsService, monkeypatch
    ) -> None:
        captions = LyricsResponse(
            synced=True,
            lines=[{"time": 1.0, "text": "Caption"}],
            source="captions",
        )
        monkeypatch.setattr(
            LyricsService, "fetch_lrclib", staticmethod(lambda *a, **k: None)
        )
        monkeypatch.setattr(
            LyricsService, "fetch_ytmusic", lambda self, title, artist: None
        )
        monkeypatch.setattr(lyrics, "fetch_captions", lambda video_id: captions)

        result = lyrics.get_lyrics(
            title="Song", artist="Artist", duration=200, video_id="abc123"
        )

        assert result.source == "captions"
        assert result.synced is True
        assert result.lines[0].text == "Caption"

    def test_captions_skipped_without_video_id(
        self, lyrics: LyricsService, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            LyricsService, "fetch_lrclib", staticmethod(lambda *a, **k: None)
        )
        monkeypatch.setattr(
            LyricsService, "fetch_ytmusic", lambda self, title, artist: None
        )

        def fail(*args: object, **kwargs: object) -> None:
            raise AssertionError

        monkeypatch.setattr(lyrics, "fetch_captions", fail)

        result = lyrics.get_lyrics(title="Song", artist="Artist", duration=200)

        assert result.lines == []
        assert result.source is None


class TestParseVtt:
    def test_parses_timestamps_and_merges_lines(self) -> None:
        vtt = (
            "WEBVTT\nKind: captions\nLanguage: en\n\n"
            "1\n00:00:01.000 --> 00:00:04.000\nHello <c>world</c>\n\n"
            "2\n00:00:05.000 --> 00:00:08.000\nLine two\ncontinued\n\n"
        )
        lines = LyricsService.parse_vtt(vtt)
        assert lines[0].time == pytest.approx(1.0)
        assert lines[0].text == "Hello world"
        assert lines[1].time == pytest.approx(5.0)
        assert lines[1].text == "Line two continued"

    def test_skips_cue_ids_and_headers(self) -> None:
        lines = LyricsService.parse_vtt("00:00:01.000 --> 00:00:02.000\nLyric\n")
        assert len(lines) == 1
        assert lines[0].text == "Lyric"

    def test_unescapes_html_entities(self) -> None:
        lines = LyricsService.parse_vtt(
            "00:00:01.000 --> 00:00:02.000\nRock &amp; roll\n"
        )
        assert lines[0].text == "Rock & roll"

    def test_vtt_timestamp_formats(self) -> None:
        assert LyricsService._vtt_timestamp("01:05.500") == pytest.approx(65.5)
        assert LyricsService._vtt_timestamp("00:01:02.250") == pytest.approx(62.25)


class TestPickCaption:
    def test_prefers_nepali_then_english(self) -> None:
        captions = {
            "en": [{"url": "en-url"}],
            "ne": [{"url": "ne-url"}],
            "hi": [{"url": "hi-url"}],
        }
        assert LyricsService._pick_caption_url(captions) == "ne-url"

    def test_falls_back_to_first_track(self) -> None:
        captions = {"hi": [{"url": "hi-url"}]}
        assert LyricsService._pick_caption_url(captions) == "hi-url"

    def test_empty_returns_none(self) -> None:
        assert LyricsService._pick_caption_url({}) is None
        assert LyricsService._pick_caption_url(None) is None
