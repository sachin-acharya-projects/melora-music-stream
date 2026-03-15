from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session, contains_eager

from app.db.base import get_db
from app.db.models import PlaylistModel, SongModel
from app.schemas.song import PlaylistCreate, PlaylistImport, Song
from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/")
def get_playlists(
    sort_by: str = Query("created_at", pattern="^(name|created_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    # Determine sorting column
    sort_col = getattr(SongModel, sort_by, "title")
    order_func = asc if order == "asc" else desc

    playlists = (
        db.query(PlaylistModel)
        .outerjoin(PlaylistModel.songs)
        .options(
            contains_eager(PlaylistModel.songs)
        )
        .order_by(
            PlaylistModel.id, order_func(sort_col)
        )
        .all()
    )

    result = []
    for p in playlists:
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "created_at": (
                    p.created_at.isoformat() if p.created_at is not None else None
                ),
                "songs": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "uploader": s.uploader,
                        "thumbnail": s.thumbnail,
                        "duration": s.duration,
                        "created_at": (
                            s.created_at.isoformat()
                            if s.created_at is not None
                            else None
                        ),
                    }
                    for s in p.songs
                ],
            }
        )
    return result


@router.get("/{playlist_id}")
def get_playlist(
    playlist_id: str,
    q: str | None = Query(None),
    sort_by: str = Query("created_at", pattern="^(title|created_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    )
    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    songs_query = (
        db.query(SongModel)
        .join(PlaylistModel.songs)
        .filter(PlaylistModel.id == playlist_id)
    )

    if q:
        songs_query = songs_query.filter(
            (SongModel.title.ilike(f"%{q}%")) | (SongModel.uploader.ilike(f"%{q}%"))
        )

    # Apply sorting to songs
    sort_col = getattr(SongModel, sort_by)
    order_func = asc if order == "asc" else desc
    songs_query = songs_query.order_by(order_func(sort_col))

    songs = songs_query.all()

    return {
        "id": db_playlist.id,
        "name": db_playlist.name,
        "created_at": (
            db_playlist.created_at.isoformat()
            if db_playlist.created_at is not None
            else None
        ),
        "songs": [
            {
                "id": s.id,
                "title": s.title,
                "uploader": s.uploader,
                "thumbnail": s.thumbnail,
                "duration": s.duration,
                "created_at": (
                    s.created_at.isoformat() if s.created_at is not None else None
                ),
            }
            for s in songs
        ],
    }


@router.post("/")
def create_playlist(data: PlaylistCreate, db: Session = Depends(get_db)):
    # Idempotent create: if exists by name, return it
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
    )
    if db_playlist is not None:
        return {
            "message": "Playlist already exists",
            "id": db_playlist.id,
            "name": db_playlist.name,
        }

    new_playlist = PlaylistModel(name=data.name)
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)
    return {
        "message": "Playlist created",
        "id": new_playlist.id,
        "name": new_playlist.name,
    }


@router.patch("/{playlist_id}")
def update_playlist_name(
    playlist_id: str, data: PlaylistCreate, db: Session = Depends(get_db)
):
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    )
    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Check if new name is already taken
    existing = db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
    if existing is not None and bool(existing.id != playlist_id):  # type: ignore
        raise HTTPException(status_code=400, detail="Playlist name already exists")

    db_playlist.name = data.name  # type: ignore
    db.commit()
    return {
        "message": "Playlist updated",
        "id": db_playlist.id,
        "name": db_playlist.name,
    }


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str, db: Session = Depends(get_db)):
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    )
    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    db.delete(db_playlist)
    db.commit()
    return {"message": "Playlist deleted"}


@router.post("/{playlist_id_or_name}/add")
def add_to_playlist(
    playlist_id_or_name: str, song: Song, db: Session = Depends(get_db)
):
    # Try by ID first, then by name
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id_or_name).first()
    )
    if db_playlist is None:
        db_playlist = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.name == playlist_id_or_name)
            .first()
        )

    # If still not found, create by name (using playlist_id_or_name as name)
    if db_playlist is None:
        db_playlist = PlaylistModel(name=playlist_id_or_name)
        db.add(db_playlist)
        db.commit()
        db.refresh(db_playlist)

    # Idempotent song creation
    db_song = db.query(SongModel).filter(SongModel.id == song.id).first()
    if db_song is None:
        db_song = SongModel(
            id=song.id,
            title=song.title,
            uploader=song.uploader,
            thumbnail=song.thumbnail,
            duration=song.duration,
        )
        db.add(db_song)
        db.commit()
        db.refresh(db_song)

    # Idempotent song addition to playlist
    song_ids = [str(s.id) for s in db_playlist.songs]
    if str(db_song.id) not in song_ids:
        db_playlist.songs.append(db_song)
        db.commit()
        return {"message": "Song added", "playlist_id": db_playlist.id}

    return {"message": "Song already in playlist", "playlist_id": db_playlist.id}


@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(
    playlist_id: str, song_id: str, db: Session = Depends(get_db)
):
    db_playlist = (
        db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
    )
    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    db_song = db.query(SongModel).filter(SongModel.id == song_id).first()
    if db_song is None or str(db_song.id) not in [str(s.id) for s in db_playlist.songs]:
        raise HTTPException(status_code=404, detail="Song not found in playlist")

    db_playlist.songs.remove(db_song)
    db.commit()
    return {"message": "Song removed from playlist"}


@router.post("/import")
def import_playlist(data: PlaylistImport, db: Session = Depends(get_db)):
    try:
        # 1. Identify playlist
        db_playlist = None
        if data.id:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.id == data.id).first()
            )
            if db_playlist is None:
                raise HTTPException(
                    status_code=404, detail="Playlist with provided ID not found"
                )
        elif data.name:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
            )
            if db_playlist is None:
                db_playlist = PlaylistModel(name=data.name)
                db.add(db_playlist)
                db.commit()
                db.refresh(db_playlist)
        else:
            raise HTTPException(
                status_code=400,
                detail="Either playlist 'id' or 'name' must be provided",
            )

        # 2. Extract songs
        songs_data = youtube_service.extract_playlist_info(data.url)

        # 3. Add songs idempotently
        count = 0
        current_song_ids = [str(s.id) for s in db_playlist.songs]
        for s_data in songs_data:
            db_song = db.query(SongModel).filter(SongModel.id == s_data["id"]).first()
            if db_song is None:
                db_song = SongModel(
                    id=s_data["id"],
                    title=s_data["title"],
                    uploader=s_data["uploader"],
                    thumbnail=s_data["thumbnail"],
                    duration=s_data["duration"],
                )
                db.add(db_song)
                db.commit()
                db.refresh(db_song)

            if str(db_song.id) not in current_song_ids:
                db_playlist.songs.append(db_song)
                current_song_ids.append(str(db_song.id))
                count += 1

        db.commit()
        return {"message": "Imported", "count": count, "playlist_id": db_playlist.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from None
