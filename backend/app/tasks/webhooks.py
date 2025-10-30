from celery import Task
from uuid import UUID

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.services.webhook_service import WebhookService


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


@celery_app.task(name="send_webhook", base=AsyncTask, bind=True)
async def send_webhook(self, delivery_id: str):
    async with AsyncSessionLocal() as db:
        webhook_service = WebhookService(db)
        await webhook_service.send_webhook_delivery(UUID(delivery_id))


@celery_app.task(name="retry_webhook", base=AsyncTask, bind=True)
async def retry_webhook(self, delivery_id: str):
    async with AsyncSessionLocal() as db:
        webhook_service = WebhookService(db)
        await webhook_service.send_webhook_delivery(UUID(delivery_id))
