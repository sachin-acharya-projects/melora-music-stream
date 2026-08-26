"""Album library endpoints: favorite albums and read their details."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, OptionalUser, SessionDep
from app.schemas.album import AlbumFavoriteCreate
from app.services.albums import album_service

router = APIRouter()


@router.get("/favorites", response_model=None)
def list_favorite_albums(
    db: SessionDep, current_user: CurrentUser
) -> list[dict[str, Any]]:
    """All albums the user has favorited, newest first."""
    return album_service.list_favorites(db, user_id=current_user.id)


@router.post("/{browse_id}/favorite", response_model=None)
def favorite_album(
    browse_id: str,
    payload: AlbumFavoriteCreate | None = None,
    db: SessionDep = None,
    current_user: CurrentUser = None,
) -> AlbumModel:
    """Add an album to the user's favorites. Metadata may be supplied by the
    client to avoid an extra lookup."""
    album = album_service.favorite(
        db,
        user_id=current_user.id,
        browse_id=browse_id,
        payload=payload.model_dump() if payload else None,
    )
    return album


@router.delete("/{browse_id}/favorite")
def unfavorite_album(
    browse_id: str, db: SessionDep, current_user: CurrentUser
) -> dict[str, Any]:
    removed = album_service.unfavorite(
        db, user_id=current_user.id, browse_id=browse_id
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Album not in favorites")
    return {"ok": True}


@router.get("/{browse_id}", response_model=None)
def get_album(
    browse_id: str, db: SessionDep, current_user: OptionalUser = None
) -> dict[str, Any]:
    """Album metadata plus its track list, with the user's favorite flag."""
    detail = album_service.get_detail(
        db, user_id=current_user.id if current_user else None, browse_id=browse_id
    )
    if detail is None:
        raise HTTPException(status_code=404, detail="Album not found")
    return detail
