"""Bug report endpoints.

The wire contract these implement (multipart POST + JSON GETs under /bugs) is
defined by the @sachin-acharya-projects/bug-reporter package; the admin
surface (/admin/bugs) is Melora-specific.
"""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.core.config import settings
from app.db.models.bug_report import BugReportModel, BugReportSeverity
from app.db.models.user import UserModel, UserRole
from app.schemas.bug_report import BugReportResponse, BugReportUpdate
from app.services.bug_reports import BugReportService
from app.services.notifications.service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter()
admin_router = APIRouter()

ALLOWED_SCREENSHOT_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _notify_admins(db: Session, report: BugReportModel) -> None:
    """Fan out an in-app + email notification about a new report to all admins.

    The email leg only fires when EMAIL_NOTIFICATIONS_ENABLED and the admin's
    per-event channel toggles allow it (see NotificationService.dispatch).
    """
    admins = db.query(UserModel).filter(UserModel.role == UserRole.ADMIN).all()
    for admin in admins:
        try:
            NotificationService.dispatch(
                db,
                user=admin,
                event_type="bug_report",
                title="New bug report",
                message=f"[{report.severity.upper()}] {report.title}",
                data={
                    "bug_report_id": report.id,
                    "severity": report.severity,
                },
            )
        except Exception:
            db.rollback()
            logger.warning(
                "Bug report notification failed for admin %s",
                admin.id,
                exc_info=True,
            )


@router.post("")
async def create_bug_report(
    db: SessionDep,
    user: CurrentUser,
    title: Annotated[str, Form(min_length=3, max_length=200)],
    severity: Annotated[BugReportSeverity, Form()] = BugReportSeverity.LOW,
    description: Annotated[str | None, Form(max_length=5000)] = None,
    screenshot: Annotated[UploadFile | None, File()] = None,
    network_context: Annotated[str | None, Form(max_length=100_000)] = None,
) -> BugReportResponse:
    """Submit a new bug report (optionally with an annotated screenshot)."""
    content: bytes | None = None
    if screenshot:
        content = await screenshot.read()
        max_bytes = settings.BUG_REPORT_SCREENSHOT_MAX_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Screenshot exceeds the {settings.BUG_REPORT_SCREENSHOT_MAX_MB} MB limit",
            )
        if screenshot.content_type not in ALLOWED_SCREENSHOT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Screenshot must be a PNG, JPEG or WebP image",
            )

    context_data: dict[str, Any] | None = None
    if network_context:
        try:
            parsed = json.loads(network_context)
            if isinstance(parsed, dict):
                context_data = parsed
            else:
                logger.warning("Ignoring non-object network_context in bug report")
        except json.JSONDecodeError:
            logger.warning("Ignoring invalid network_context JSON in bug report")

    report = BugReportService.create_report(
        db,
        user_id=user.id,
        title=title,
        description=description,
        severity=severity.value,
        screenshot=content,
        network_context=context_data,
    )
    _notify_admins(db, report)
    return BugReportResponse.model_validate(report)


@router.get("")
def list_my_bug_reports(
    db: SessionDep,
    user: CurrentUser,
) -> list[BugReportResponse]:
    """List the current user's own bug reports."""
    return BugReportService.list_for_user(db, user_id=user.id)


@router.get("/{report_id}")
def get_bug_report(
    report_id: str,
    db: SessionDep,
    user: CurrentUser,
) -> BugReportResponse:
    """Fetch one of the current user's bug reports."""
    report = BugReportService.get_for_user(
        db, report_id=report_id, user_id=user.id
    )
    if not report:
        raise HTTPException(status_code=404, detail="Bug report not found")
    return BugReportResponse.model_validate(report)


@admin_router.get("")
def list_bug_reports(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
    status: Annotated[str | None, Query(pattern="^(pending|in_progress|resolved)$")] = None,
    severity: Annotated[str | None, Query(pattern="^(low|medium|high|critical)$")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
) -> dict[str, Any]:
    """All bug reports, optionally filtered by status and severity."""
    return BugReportService.list_all(
        db,
        status=status,
        severity=severity,
        page=page,
        page_size=page_size,
    )


@admin_router.patch("/{report_id}")
def update_bug_report_status(
    report_id: str,
    update: BugReportUpdate,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> BugReportResponse:
    """Move a report through its status lifecycle (pending/in_progress/resolved)."""
    try:
        report = BugReportService.set_status(
            db, report_id=report_id, status=update.status.value
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Bug report not found") from exc
    return BugReportResponse.model_validate(report)


@admin_router.delete("/{report_id}")
def delete_bug_report(
    report_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Delete a bug report."""
    try:
        BugReportService.delete(db, report_id=report_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Bug report not found") from exc
    return {"id": report_id, "deleted": True}
