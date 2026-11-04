from fastapi import APIRouter

from app.api.endpoints import (
    admin,
    albums,
    artists,
    auth,
    bug_reports,
    cache,
    developer,
    discover,
    history,
    media,
    notifications,
    oauth,
    oidc_auth,
    oidc_providers,
    playlists,
    radio,
    recommendations,
    releases,
    search,
    songs,
    state,
    stats,
    users,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(oidc_providers.router, prefix="/admin", tags=["Identity Providers"])
api_router.include_router(albums.router, prefix="/albums", tags=["Albums"])
api_router.include_router(artists.router, prefix="/artists", tags=["Artists"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oidc_auth.router, prefix="/auth", tags=["OIDC Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth 2.0"])
api_router.include_router(cache.router, prefix="/cache", tags=["Cache"])
api_router.include_router(discover.router, prefix="/discover", tags=["Discover"])
api_router.include_router(developer.router, prefix="/developer", tags=["Developer API"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(radio.router, prefix="/radio", tags=["Radio"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(releases.router, prefix="/releases", tags=["Releases"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(stats.router, prefix="/stats", tags=["Stats"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(songs.router, prefix="/songs", tags=["Songs"])
api_router.include_router(state.router, prefix="/state", tags=["State"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
if settings.ENABLE_BUGREPORTER:
    api_router.include_router(bug_reports.router, prefix="/bugs", tags=["Bug Reports"])
    api_router.include_router(bug_reports.admin_router, prefix="/admin/bugs", tags=["Bug Reports"])
