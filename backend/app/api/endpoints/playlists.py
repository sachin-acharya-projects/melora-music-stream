from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import PlaylistModel, SongModel
from app.schemas.song import PlaylistCreate, PlaylistImport, Song
from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/")
def get_playlists(db: Session = Depends(get_db)):
    playlists = db.query(PlaylistModel).all()
    result = []
    for p in playlists:
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "songs": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "uploader": s.uploader,
                        "thumbnail": s.thumbnail,
                        "duration": s.duration,
                    }
                    for s in p.songs
                ],
            }
        )
    return result


@router.post("/")
def create_playlist(data: PlaylistCreate, db: Session = Depends(get_db)):
    # Idempotent create: if exists by name, return it
    db_playlist = db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
    if db_playlist:
        return {"message": "Playlist already exists", "id": db_playlist.id, "name": db_playlist.name}

    new_playlist = PlaylistModel(name=data.name)
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)
    return {"message": "Playlist created", "id": new_playlist.id, "name": new_playlist.name}


@router.post("/{playlist_id_or_name}/add")
def add_to_playlist(playlist_id_or_name: str, song: Song, db: Session = Depends(get_db)):
    # Try by ID first, then by name
    db_playlist = db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id_or_name).first()
    if not db_playlist:
        db_playlist = db.query(PlaylistModel).filter(PlaylistModel.name == playlist_id_or_name).first()

    # If still not found, create by name (using playlist_id_or_name as name)
    if not db_playlist:
        db_playlist = PlaylistModel(name=playlist_id_or_name)
        db.add(db_playlist)
        db.commit()
        db.refresh(db_playlist)

    # Idempotent song creation
    db_song = db.query(SongModel).filter(SongModel.id == song.id).first()
    if not db_song:
        db_song = SongModel(
            id=song.id, title=song.title, uploader=song.uploader, thumbnail=song.thumbnail, duration=song.duration
        )
        db.add(db_song)
        db.commit()
        db.refresh(db_song)

    # Idempotent song addition to playlist
    if db_song not in db_playlist.songs:
        db_playlist.songs.append(db_song)
        db.commit()
        return {"message": "Song added", "playlist_id": db_playlist.id}

    return {"message": "Song already in playlist", "playlist_id": db_playlist.id}


@router.post("/import")
def import_playlist(data: PlaylistImport, db: Session = Depends(get_db)):
    try:
        # 1. Identify playlist
        db_playlist = None
        if data.id:
            db_playlist = db.query(PlaylistModel).filter(PlaylistModel.id == data.id).first()
            if not db_playlist:
                raise HTTPException(status_code=404, detail="Playlist with provided ID not found")
        elif data.name:
            db_playlist = db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
            if not db_playlist:
                db_playlist = PlaylistModel(name=data.name)
                db.add(db_playlist)
                db.commit()
                db.refresh(db_playlist)
        else:
            raise HTTPException(status_code=400, detail="Either playlist 'id' or 'name' must be provided")

        # 2. Extract songs
        songs_data = youtube_service.extract_playlist_info(data.url)

        # 3. Add songs idempotently
        count = 0
        for s_data in songs_data:
            db_song = db.query(SongModel).filter(SongModel.id == s_data["id"]).first()
            if not db_song:
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

            if db_song not in db_playlist.songs:
                db_playlist.songs.append(db_song)
                count += 1

        db.commit()
        return {"message": "Imported", "count": count, "playlist_id": db_playlist.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from None
