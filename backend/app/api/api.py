from fastapi import APIRouter

from app.api.endpoints import auth, media, playlists, search, state

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(state.router, prefix="/state", tags=["State"])
