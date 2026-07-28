from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.song import PlaylistCreate, PlaylistImport, Song
from app.services.playlists import PlaylistService

router = APIRouter()


@router.get("/")
def get_playlists(
    db: SessionDep,
    sort_by: Annotated[str, Query(pattern="^(name|created_at)$")] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> list[dict[str, Any]]:
    return PlaylistService.get_all_playlists(db, sort_by=sort_by, order=order)


@router.get("/{playlist_id}")
def get_playlist(
    playlist_id: str,
    db: SessionDep,
    q: Annotated[str | None, Query()] = None,
    sort_by: Annotated[str, Query(pattern="^(title|created_at)$")] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> dict[str, Any]:
    return PlaylistService.get_playlist_by_id(db, playlist_id, search_query=q, sort_by=sort_by, order=order)


@router.post("/")
def create_playlist(data: PlaylistCreate, db: SessionDep) -> dict[str, Any]:
    return PlaylistService.create_playlist(db, name=data.name)


@router.patch("/{playlist_id}")
def update_playlist_name(playlist_id: str, data: PlaylistCreate, db: SessionDep) -> dict[str, Any]:
    return PlaylistService.update_playlist_name(db, playlist_id=playlist_id, new_name=data.name)


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str, db: SessionDep) -> dict[str, str]:
    return PlaylistService.delete_playlist(db, playlist_id=playlist_id)


@router.post("/{playlist_id_or_name}/add")
def add_to_playlist(playlist_id_or_name: str, song: Song, db: SessionDep) -> dict[str, Any]:
    return PlaylistService.add_song_to_playlist(db, playlist_id_or_name=playlist_id_or_name, song=song)


@router.post("/{playlist_id_or_name}/add-bulk")
def add_songs_to_playlist(
    playlist_id_or_name: str, songs: list[Song], db: SessionDep
) -> dict[str, Any]:
    return PlaylistService.add_songs_bulk_to_playlist(db, playlist_id_or_name=playlist_id_or_name, songs=songs)


@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(playlist_id: str, song_id: str, db: SessionDep) -> dict[str, str]:
    return PlaylistService.remove_song_from_playlist(db, playlist_id=playlist_id, song_id=song_id)


@router.post("/import")
def import_playlist(data: PlaylistImport, db: SessionDep) -> dict[str, Any]:
    return PlaylistService.import_playlist(db, data)
