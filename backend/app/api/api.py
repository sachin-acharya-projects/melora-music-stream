from fastapi import APIRouter

from app.api.endpoints import (
    admin,
    artists,
    auth,
    history,
    media,
    playlists,
    search,
    songs,
    state,
    stats,
    users,
)

api_router = APIRouter()
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(artists.router, prefix="/artists", tags=["Artists"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(stats.router, prefix="/stats", tags=["Stats"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(songs.router, prefix="/songs", tags=["Songs"])
api_router.include_router(state.router, prefix="/state", tags=["State"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
