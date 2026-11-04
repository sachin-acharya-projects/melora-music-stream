"""Polling worker for durable webhook deliveries.

Run with: python -m app.workers.webhook_worker
"""

import asyncio
import logging

from app.db.base import SessionLocal
from app.services.webhooks import WebhookDeliveryService

logger = logging.getLogger(__name__)
POLL_INTERVAL_SECONDS = 5


async def run_worker() -> None:
    """Continuously process due webhook deliveries with bounded polling."""
    while True:
        try:
            with SessionLocal() as db:
                result = await WebhookDeliveryService.deliver_pending(db)
            if result["delivered"] or result["retried"] or result["failed"]:
                logger.info("Webhook delivery batch: %s", result)
        except Exception:
            logger.exception("Webhook delivery worker iteration failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
