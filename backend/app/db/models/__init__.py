from app.db.models.admin_settings import AdminSettingsModel
from app.db.models.album import AlbumModel
from app.db.models.artist import ArtistModel
from app.db.models.associations import (
    album_favorites,
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
from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.notification import NotificationModel
from app.db.models.oauth_application import OAuthApplicationModel
from app.db.models.oidc_login_handoff import OIDCLoginHandoffModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.db.models.personal_access_token import PersonalAccessTokenModel
from app.db.models.playback_state import PlaybackStateModel
from app.db.models.playlist import PlaylistModel
from app.db.models.playlist_share import PlaylistShareModel
from app.db.models.release import ReleaseModel
from app.db.models.search_history import SearchHistoryModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel, UserRole
from app.db.models.user_stats import UserStatsModel

__all__ = [
    "AdminSettingsModel",
    "AlbumModel",
    "ArtistModel",
    "BugReportModel",
    "BugReportSeverity",
    "BugReportStatus",
    "ExternalIdentityModel",
    "ListeningHistoryModel",
    "NotificationModel",
    "OAuthApplicationModel",
    "OIDCLoginHandoffModel",
    "OIDCProviderModel",
    "PersonalAccessTokenModel",
    "PlaybackStateModel",
    "PlaylistModel",
    "PlaylistShareModel",
    "ReleaseModel",
    "SearchHistoryModel",
    "SongModel",
    "UserModel",
    "UserRole",
    "UserStatsModel",
    "album_favorites",
    "playlist_follows",
    "playlist_song",
    "song_artist",
    "user_artist_follows",
    "user_follows",
]
