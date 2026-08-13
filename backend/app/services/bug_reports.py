"""Service for user bug reports."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.core.config import settings
from app.db.models.bug_report import (
    BugReportModel,
    BugReportStatus,
)
from app.schemas.bug_report import BugReportResponse

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class BugReportService:
    """Create, list and manage user bug reports."""

    @staticmethod
    def create_report(
        db: Session,
        *,
        user_id: str,
        title: str,
        description: str | None,
        severity: str,
        screenshot: bytes | None,
    ) -> BugReportModel:
        screenshot_url = None
        if screenshot:
            screenshot_url = BugReportService._save_screenshot(screenshot)

        report = BugReportModel(
            user_id=user_id,
            title=title,
            description=description or None,
            severity=severity,
            status=BugReportStatus.PENDING,
            screenshot_url=screenshot_url,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def list_for_user(db: Session, *, user_id: str) -> list[BugReportResponse]:
        rows = (
            db.query(BugReportModel)
            .filter(BugReportModel.user_id == user_id)
            .order_by(BugReportModel.created_at.desc())
            .all()
        )
        return [BugReportResponse.model_validate(row) for row in rows]

    @staticmethod
    def get_for_user(
        db: Session, *, report_id: str, user_id: str
    ) -> BugReportModel | None:
        return (
            db.query(BugReportModel)
            .filter(
                BugReportModel.id == report_id,
                BugReportModel.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def get_by_id(db: Session, *, report_id: str) -> BugReportModel | None:
        return (
            db.query(BugReportModel)
            .filter(BugReportModel.id == report_id)
            .first()
        )

    @staticmethod
    def list_all(
        db: Session,
        *,
        status: str | None,
        severity: str | None,
        page: int,
        page_size: int,
    ) -> dict:
        query = db.query(BugReportModel)
        if status:
            query = query.filter(BugReportModel.status == status)
        if severity:
            query = query.filter(BugReportModel.severity == severity)

        total = query.count()
        rows = (
            query.order_by(BugReportModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "items": [BugReportResponse.model_validate(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    def set_status(db: Session, *, report_id: str, status: str) -> BugReportModel:
        report = BugReportService.get_by_id(db, report_id=report_id)
        if not report:
            raise KeyError(report_id)

        report.status = status
        report.resolved_at = (
            datetime.now(UTC) if status == BugReportStatus.RESOLVED else None
        )
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def delete(db: Session, *, report_id: str) -> None:
        report = BugReportService.get_by_id(db, report_id=report_id)
        if not report:
            raise KeyError(report_id)
        db.delete(report)
        db.commit()

    @staticmethod
    def _save_screenshot(content: bytes) -> str:
        """Persist a screenshot under the media root and return its public URL."""
        filename = f"{uuid.uuid4()}.png"
        path = settings.bug_reports_dir_path / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return f"{settings.bug_reports_url_prefix}/{filename}"
