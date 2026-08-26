"""Per-user search history for the recent-searches UI."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.search_history import SearchHistoryModel


class SearchHistoryService:
    """Record and serve a user's recent, de-duplicated search queries."""

    MAX_ENTRIES_PER_USER = 20
    MIN_QUERY_LENGTH = 2
    MAX_QUERY_LENGTH = 200

    @staticmethod
    def record(db: Session, *, user_id: str, query: str) -> None:
        """Record a search, bumping an existing entry instead of duplicating."""
        normalized = query.strip()[: SearchHistoryService.MAX_QUERY_LENGTH]
        if len(normalized) < SearchHistoryService.MIN_QUERY_LENGTH:
            return

        existing = (
            db.query(SearchHistoryModel)
            .filter(
                SearchHistoryModel.user_id == user_id,
                func.lower(SearchHistoryModel.query) == normalized.lower(),
            )
            .first()
        )
        if existing is not None:
            existing.query = normalized
            existing.searched_at = datetime.now(UTC)
        else:
            db.add(
                SearchHistoryModel(
                    user_id=user_id,
                    query=normalized,
                    searched_at=datetime.now(UTC),
                )
            )
        db.commit()
        SearchHistoryService._prune(db, user_id=user_id)

    @staticmethod
    def list_recent(db: Session, *, user_id: str, limit: int = 10) -> list[SearchHistoryModel]:
        return (
            db.query(SearchHistoryModel)
            .filter(SearchHistoryModel.user_id == user_id)
            .order_by(SearchHistoryModel.searched_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def delete_entry(db: Session, *, user_id: str, entry_id: str) -> bool:
        row = (
            db.query(SearchHistoryModel)
            .filter(
                SearchHistoryModel.user_id == user_id,
                SearchHistoryModel.id == entry_id,
            )
            .first()
        )
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True

    @staticmethod
    def clear(db: Session, *, user_id: str) -> int:
        deleted = (
            db.query(SearchHistoryModel)
            .filter(SearchHistoryModel.user_id == user_id)
            .delete()
        )
        db.commit()
        return int(deleted)

    @staticmethod
    def _prune(db: Session, *, user_id: str) -> None:
        keep = (
            db.query(SearchHistoryModel.id)
            .filter(SearchHistoryModel.user_id == user_id)
            .order_by(SearchHistoryModel.searched_at.desc())
            .limit(SearchHistoryService.MAX_ENTRIES_PER_USER)
            .subquery()
        )
        db.query(SearchHistoryModel).filter(
            SearchHistoryModel.user_id == user_id,
            SearchHistoryModel.id.notin_(select(keep)),
        ).delete(synchronize_session=False)
        db.commit()


search_history_service = SearchHistoryService()
