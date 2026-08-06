from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, OptionalUser, SessionDep
from app.schemas.song import PlaylistCreate, PlaylistImport, PlaylistUpdate, Song
from app.services.playlist_import import PlaylistImportService
from app.services.playlist_share import PlaylistShareService
from app.services.playlists import PlaylistService

router = APIRouter()


@router.get("/")
def get_playlists(
    db: SessionDep,
    user: CurrentUser,
    sort_by: Annotated[str, Query(pattern="^(name|created_at)$")] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> list[dict[str, Any]]:
    return PlaylistService.get_all_playlists(db, user, sort_by=sort_by, order=order)


@router.get("/discover")
def get_discover_playlists(
    db: SessionDep,
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[dict[str, Any]]:
    return PlaylistService.get_discover_playlists(db, user, limit=limit)


@router.get("/following")
def get_following_playlists(db: SessionDep, user: CurrentUser) -> list[dict[str, Any]]:
    return PlaylistService.get_following_playlists(db, user)


@router.get("/shared/{token}")
def get_shared_playlist(token: str, db: SessionDep) -> dict[str, Any]:
    return PlaylistShareService.get_shared_playlist(db, token)


@router.post("/{playlist_id}/share")
def create_share_link(
    playlist_id: str, db: SessionDep, user: CurrentUser
) -> dict[str, str]:
    return {
        "token": PlaylistShareService.create_share_link(
            db, playlist_id=playlist_id, user=user
        )
    }


@router.delete("/{playlist_id}/share")
def revoke_share_link(
    playlist_id: str, db: SessionDep, user: CurrentUser
) -> dict[str, str]:
    return PlaylistShareService.revoke_share_link(
        db, playlist_id=playlist_id, user=user
    )


@router.get("/{playlist_id}")
def get_playlist(
    playlist_id: str,
    db: SessionDep,
    user: OptionalUser,
    q: Annotated[str | None, Query()] = None,
    sort_by: Annotated[
        str, Query(pattern="^(title|uploader|duration|created_at)$")
    ] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
) -> dict[str, Any]:
    return PlaylistService.get_playlist_by_id(
        db,
        playlist_id,
        user,
        search_query=q,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


@router.post("/{playlist_id}/follow")
def toggle_follow(
    playlist_id: str, db: SessionDep, user: CurrentUser
) -> dict[str, Any]:
    return PlaylistService.toggle_follow(db, playlist_id=playlist_id, user=user)


@router.post("/")
def create_playlist(
    data: PlaylistCreate, db: SessionDep, user: CurrentUser
) -> dict[str, Any]:
    return PlaylistService.create_playlist(
        db,
        user=user,
        name=data.name,
        description=data.description,
        visibility=data.visibility,
    )


@router.patch("/{playlist_id}")
def update_playlist(
    playlist_id: str, data: PlaylistUpdate, db: SessionDep, user: CurrentUser
) -> dict[str, Any]:
    return PlaylistService.update_playlist(
        db, playlist_id=playlist_id, user=user, data=data
    )


@router.delete("/{playlist_id}")
def delete_playlist(
    playlist_id: str, db: SessionDep, user: CurrentUser
) -> dict[str, str]:
    return PlaylistService.delete_playlist(db, playlist_id=playlist_id, user=user)


@router.post("/{playlist_id_or_name}/add")
def add_to_playlist(
    playlist_id_or_name: str,
    song: Song,
    db: SessionDep,
    user: CurrentUser,
) -> dict[str, Any]:
    return PlaylistService.add_song_to_playlist(
        db, playlist_id_or_name=playlist_id_or_name, song=song, user=user
    )


@router.post("/{playlist_id_or_name}/add-bulk")
def add_songs_to_playlist(
    playlist_id_or_name: str,
    songs: list[Song],
    db: SessionDep,
    user: CurrentUser,
) -> dict[str, Any]:
    return PlaylistService.add_songs_bulk_to_playlist(
        db, playlist_id_or_name=playlist_id_or_name, songs=songs, user=user
    )


@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(
    playlist_id: str, song_id: str, db: SessionDep, user: CurrentUser
) -> dict[str, str]:
    return PlaylistService.remove_song_from_playlist(
        db, playlist_id=playlist_id, song_id=song_id, user=user
    )


@router.post("/import")
def import_playlist(
    data: PlaylistImport, db: SessionDep, user: CurrentUser
) -> dict[str, Any]:
    return PlaylistImportService.import_playlist(db, data, user)
