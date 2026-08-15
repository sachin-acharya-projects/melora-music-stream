from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Query

from app.api.deps import (
    CurrentUser,
    OptionalUser,
    SessionDep,
)
from app.schemas.artist import YouTubeArtistImport
from app.services.artist import ArtistService
from app.services.youtube_artist import YouTubeArtistService

router = APIRouter()


@router.get("/")
def get_artists(
    db: SessionDep,
    user: CurrentUser,
    search: Annotated[str | None, Query(max_length=100)] = None,
    sort_by: Annotated[
        str,
        Query(pattern="^(name|follower_count|monthly_listeners|created_at|plays)$"),
    ] = "follower_count",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
    source: Annotated[str | None, Query(pattern="^(youtube)$")] = None,
) -> dict[str, Any]:
    return ArtistService.get_all_artists(
        db,
        user,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        source=source,
    )


@router.get("/featured")
def get_featured_artists(db: SessionDep, user: CurrentUser) -> dict[str, Any]:
    return ArtistService.get_featured_artists(db, user)


@router.get("/suggested")
def get_suggested_artists(
    db: SessionDep,
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, Any]:
    return ArtistService.get_suggested_artists(
        db, user.id, page=page, page_size=page_size
    )


@router.get("/following")
def get_following_artists(
    db: SessionDep,
    user: CurrentUser,
    search: Annotated[str | None, Query(max_length=100)] = None,
    source: Annotated[str | None, Query(pattern="^(youtube|platform)$")] = None,
) -> list[dict[str, Any]]:
    return ArtistService.get_following_artists(db, user, search=search, source=source)


@router.get("/youtube/search")
def search_youtube_artists(
    db: SessionDep,
    _: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=100)],
    limit: Annotated[int, Query(ge=1, le=20)] = 6,
) -> dict[str, Any]:
    return YouTubeArtistService.search(db, query=q, limit=limit)


@router.post("/youtube/import")
def import_youtube_artist(
    data: YouTubeArtistImport,
    db: SessionDep,
    _: CurrentUser,
) -> dict[str, Any]:
    return YouTubeArtistService.import_artist(db, data)


@router.get("/{slug}")
def get_artist(
    db: SessionDep,
    user: OptionalUser,
    slug: str,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    result = ArtistService.get_artist_by_slug(db, slug, user, enrich=False)
    background_tasks.add_task(ArtistService.enrich_artist_in_background, result["id"])
    return result


@router.get("/{slug}/recently-played")
def get_artist_recently_played(
    db: SessionDep,
    user: CurrentUser,
    slug: str,
    limit: Annotated[int, Query(ge=1, le=500)] = 10,
) -> list[dict[str, Any]]:
    return ArtistService.get_recently_played(db, slug, user.id, limit=limit)


@router.get("/{slug}/songs")
def get_artist_songs(db: SessionDep, slug: str) -> list[dict[str, Any]]:
    return ArtistService.get_artist_songs(db, slug)


@router.get("/{slug}/albums")
def get_artist_albums(db: SessionDep, slug: str) -> dict[str, Any]:
    return ArtistService.get_artist_albums(db, slug)


@router.post("/{artist_id}/follow")
def toggle_follow(artist_id: str, db: SessionDep, user: CurrentUser) -> dict[str, Any]:
    return ArtistService.toggle_follow(db, artist_id=artist_id, user=user)
