from app.db.models.admin_settings import AdminSettingsModel
from app.db.models.album import AlbumModel
from app.db.models.artist import ArtistModel
from app.db.models.artist_identity import ArtistIdentityModel
from app.db.models.associations import (
    album_favorites,
    release_artist,
    playlist_follows,
    playlist_song,
    song_artist,
    user_artist_follows,
    user_follows,
)
from app.db.models.bug_report import (
    BugReportModel,
    BugReportSeverity,
    BugReportStatus,
)
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.notification import NotificationModel
from app.db.models.playback_state import PlaybackStateModel
from app.db.models.playlist import PlaylistModel
from app.db.models.playlist_preferences import PlaylistPreferencesModel
from app.db.models.playlist_share import PlaylistShareModel
from app.db.models.release import ReleaseModel
from app.db.models.release_track import ReleaseTrackModel
from app.db.models.recording import RecordingModel
from app.db.models.recording_identity import RecordingIdentityModel
from app.db.models.recording_enrichment_job import RecordingEnrichmentJobModel
from app.db.models.release_identity import ReleaseIdentityModel
from app.db.models.release_enrichment_job import ReleaseEnrichmentJobModel
from app.db.models.search_history import SearchHistoryModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel, UserRole
from app.db.models.user_stats import UserStatsModel

__all__ = [
    "AdminSettingsModel",
    "AlbumModel",
    "ArtistModel",
    "ArtistIdentityModel",
    "BugReportModel",
    "BugReportSeverity",
    "BugReportStatus",
    "ListeningHistoryModel",
    "NotificationModel",
    "PlaybackStateModel",
    "PlaylistModel",
    "PlaylistPreferencesModel",
    "PlaylistShareModel",
    "ReleaseModel",
    "ReleaseTrackModel",
    "RecordingModel",
    "RecordingIdentityModel",
    "RecordingEnrichmentJobModel",
    "ReleaseIdentityModel",
    "ReleaseEnrichmentJobModel",
    "SearchHistoryModel",
    "SongModel",
    "UserModel",
    "UserRole",
    "UserStatsModel",
    "album_favorites",
    "release_artist",
    "playlist_follows",
    "playlist_song",
    "song_artist",
    "user_artist_follows",
    "user_follows",
]
