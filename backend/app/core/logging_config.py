"""Logging configuration for the Melora backend.

uvicorn only attaches handlers to its own loggers, so application loggers
such as ``app.services.youtube`` would otherwise fall back to Python's
``lastResort`` handler, which only prints WARNING and above. This module wires
a root handler so our INFO logs (yt-dlp requests, cache hits/misses) reach the
console and a rotating log file.

``alembic/env.py`` runs ``fileConfig`` during migrations, which would otherwise
reset the root logger and silently disable every logger not listed in
``alembic.ini``. This setup can run again after the upgrade and re-enables all
loggers as a safety net.
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
MAX_FILE_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 3

# uvicorn keeps its loggers non-propagating and reconfigures them before app
# import; after alembic's fileConfig they can lose their handlers, so route
# them back to the root handlers.
_UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access", "uvicorn.asgi")


def setup_logging() -> None:
    """Install console + rotating-file handlers on the root logger (INFO)."""
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    formatter = logging.Formatter(LOG_FORMAT)

    if not any(
        isinstance(handler, logging.StreamHandler) for handler in root.handlers
    ):
        # stderr matches uvicorn and is flushed per line, so logs appear
        # immediately even when the server output is piped to a file.
        console = logging.StreamHandler(sys.stderr)
        console.setFormatter(formatter)
        root.addHandler(console)

    log_dir = Path(settings.LOGS_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)
    if not any(
        isinstance(handler, RotatingFileHandler) for handler in root.handlers
    ):
        file_handler = RotatingFileHandler(
            log_dir / "app.log",
            maxBytes=MAX_FILE_BYTES,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    # Alembic's fileConfig (disable_existing_loggers=True) disables every
    # logger that is not listed in alembic.ini. Since we re-apply this setup
    # after migrations, undo that so app loggers never go silent.
    for logger in logging.root.manager.loggerDict.values():
        if isinstance(logger, logging.Logger):
            logger.disabled = False

    for name in _UVICORN_LOGGERS:
        uvi_logger = logging.getLogger(name)
        uvi_logger.propagate = True
        # uvicorn attaches its own stderr handlers; drop them so records flow
        # once through the root handlers (single format in console + file).
        for handler in list(uvi_logger.handlers):
            uvi_logger.removeHandler(handler)

    # yt-dlp is very chatty on its own loggers; keep the noise down while we
    # still log our own [yt-dlp] request lines from app.services.youtube.
    logging.getLogger("yt_dlp").setLevel(logging.WARNING)

    # uvicorn --reload runs the reloader in the parent process, which also
    # imports this module. watchfiles logs "1 change detected" at INFO on every
    # filesystem event; routing those to our root handlers would write them
    # into logs/ (a watched directory) and retrigger the reloader forever.
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
