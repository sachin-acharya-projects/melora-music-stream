from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.bug_report import BugReportSeverity, BugReportStatus


class BugReportCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    severity: BugReportSeverity = BugReportSeverity.LOW


class BugReportUpdate(BaseModel):
    status: BugReportStatus


class BugReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    severity: BugReportSeverity
    status: BugReportStatus
    screenshot_url: str | None
    created_at: datetime
    resolved_at: datetime | None
