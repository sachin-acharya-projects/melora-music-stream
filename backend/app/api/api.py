from fastapi import APIRouter

from app.api.endpoints import admin, auth, media, playlists, search, songs, state

api_router = APIRouter()
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(songs.router, prefix="/songs", tags=["Songs"])
api_router.include_router(state.router, prefix="/state", tags=["State"])
