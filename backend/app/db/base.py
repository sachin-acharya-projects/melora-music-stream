import re
import uuid
from collections.abc import Generator
from datetime import UTC, datetime
from typing import Annotated

from sqlalchemy import DateTime, String, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    declared_attr,
    mapped_column,
    sessionmaker,
)

from app.core.config import settings

# For SQLite, check if it's the current DB
connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Core SQLAlchemy Declarative Base"""

    pass


class TimestampMixin:
    """Mixin for audit fields"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )


class UUIDMixin:
    """Mixin for UUID primary key"""

    id: Mapped[str] = mapped_column(
        String, primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )


class BaseModel(Base, TimestampMixin, UUIDMixin):
    """
    Application's Base Model.
    Inherits from SQLAlchemy's Base and our shared Mixins.
    """

    __abstract__ = True

    _override_tablename: Annotated[
        str | None,
        "Override the generated __tablename__",
    ] = None

    @declared_attr.directive
    def __tablename__(cls) -> str:  # noqa: N805
        if cls._override_tablename:
            return cls._override_tablename

        # Convert CamelCase to snake_case and remove "Model" suffix if present
        name = cls.__name__
        if name.endswith("Model"):
            name = name[:-5]
        # Handle CamelCase to snake_case and pluralize
        snake_name = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
        return f"{snake_name}s"


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
