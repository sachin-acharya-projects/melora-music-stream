"""Centralized, user-facing API messages.

Every HTTPException detail string lives here so wording stays consistent
and can be tuned from a single place.
"""


class Messages:
    """All user-facing messages returned to API clients."""

    # Authentication
    REFRESH_TOKEN_REQUIRED = "Refresh token required"
    INVALID_REFRESH_TOKEN = "Invalid refresh token"
    INVALID_TOKEN_PAYLOAD = "Invalid token payload"
    USER_NOT_FOUND_OR_INACTIVE = "User not found or inactive"
    INVALID_CREDENTIALS = "Invalid credentials"
    NOT_AUTHENTICATED = "Not authenticated"
    INVALID_OR_EXPIRED_TOKEN = "Invalid or expired token"
    INSUFFICIENT_PERMISSIONS = "Insufficient permissions"
    NO_USER_INFO_FROM_GOOGLE = "No user info received from Google"
    MISSING_REQUIRED_GOOGLE_USER_INFO = "Missing required user info from Google"
    GOOGLE_OAUTH_NOT_CONFIGURED = (
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    )
    OAUTH_AUTH_FAILED = "OAuth authentication failed: {error}"

    # Users
    USER_NOT_FOUND = "User not found"

    # Artists
    ARTIST_NAME_REQUIRED = "Artist name is required"
    ARTIST_NOT_FOUND = "Artist not found"
    INVALID_YOUTUBE_CHANNEL_ID = "Invalid YouTube channel id"

    # Playlists
    PLAYLIST_NOT_FOUND = "Playlist not found"
    PLAYLIST_NAME_ALREADY_EXISTS = "Playlist name already exists"
    PLAYLIST_ID_OR_NAME_REQUIRED = "Either playlist 'id' or 'name' must be provided"
    PLAYLIST_NOT_FOUND_OR_LINK_REVOKED = "Playlist not found or link revoked"
    PLAYLIST_NOT_FOUND_BY_ID = "Playlist with provided ID not found"
    CANNOT_FOLLOW_OWN_PLAYLIST = "You cannot follow your own playlist"
    COLLABORATORS_NOT_VIEWABLE = "Not allowed to view collaborators"
    OWNER_ALREADY_COLLABORATOR = "The owner is already a collaborator"
    COLLABORATOR_NOT_FOUND = "Collaborator not found"
    NO_PERMISSION_TO_MODIFY_PLAYLIST = (
        "You do not have permission to modify this playlist"
    )
    SONG_NOT_FOUND_IN_PLAYLIST = "Song not found in playlist"

    # Songs, history, lyrics
    SONG_NOT_FOUND = "Song not found"
    HISTORY_ENTRY_NOT_FOUND = "History entry not found"

    # Recommendations / radio
    MOOD_NOT_FOUND = "Mood not found"
    INVALID_SEED_TYPE = "Seed type must be 'genre', 'artist', or 'mood'"
