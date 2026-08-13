from typing import Annotated, Any, Literal

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.services.recommendations import (
    RADIO_DEFAULT_COUNT,
    RADIO_MAX_COUNT,
    RecommendationsService,
)

router = APIRouter()


@router.get("/")
def generate_radio(
    db: SessionDep,
    current_user: CurrentUser,
    seed_type: Annotated[Literal["genre", "artist", "mood"], Query()],
    seed_value: Annotated[str, Query(min_length=1, max_length=200)],
    count: Annotated[int, Query(ge=1, le=RADIO_MAX_COUNT)] = RADIO_DEFAULT_COUNT,
) -> dict[str, Any]:
    """Generate a shuffled batch of songs from a genre/artist/mood seed.

    ``seed_type="genre"`` accepts a comma-separated list (e.g. ``pop,rock``)
    to mix multiple genres into one station.
    """
    return RecommendationsService.get_radio_songs(
        db,
        user_id=current_user.id,
        seed_type=seed_type,
        seed_value=seed_value,
        count=count,
    )


@router.get("/genres")
def get_genres() -> list[dict[str, Any]]:
    """Global genre catalog (from YTMusic) for radio seeding."""
    return RecommendationsService.get_genres()


@router.get("/moods")
def get_moods() -> list[dict[str, Any]]:
    """List the supported moods for radio seeds."""
    return RecommendationsService.get_moods()


@router.get("/seeds")
def get_seeds(db: SessionDep, current_user: CurrentUser) -> dict[str, Any]:
    """Return the user's personal radio seeds (genres + top artists)."""
    return RecommendationsService.get_user_seeds(db, current_user)
