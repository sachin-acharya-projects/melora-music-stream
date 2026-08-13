"""CLI: idempotently promote a user to admin.

Usage:
    python -m app.scripts.make_admin you@example.com

Exit codes:
    0  promoted, or already an admin (idempotent no-op)
    2  no user has that email yet (not registered)
"""
from __future__ import annotations

import argparse
import sys
from typing import TYPE_CHECKING

from app.db.base import SessionLocal
from app.services.roles import ensure_admin_role

if TYPE_CHECKING:
    from collections.abc import Sequence


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Promote a user to admin (idempotent).",
    )
    parser.add_argument(
        "email",
        help="Email of the user to promote to admin",
    )
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        outcome = ensure_admin_role(db, args.email)

    if outcome == "promoted":
        print(f"Promoted {args.email} to admin.")
    elif outcome == "already_admin":
        print(f"{args.email} is already an admin.")
    else:
        print(
            f"{args.email} is not registered yet; nothing to promote. "
            "It will be promoted automatically on a later deploy once the "
            "account exists.",
            file=sys.stderr,
        )
        raise SystemExit(2)


if __name__ == "__main__":
    main()
