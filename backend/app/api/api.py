from fastapi import APIRouter

from app.api.endpoints import media, playlists, search

api_router = APIRouter()
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
