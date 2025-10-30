import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.webhook import Webhook, WebhookDelivery


class WebhookService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def generate_signature(self, payload: str, secret: str) -> str:
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    async def trigger_webhook(self, organization_id: UUID, event_type: str, payload: Dict[str, Any]):
        query = select(Webhook).where(
            and_(
                Webhook.organization_id == organization_id,
                Webhook.is_active == True
            )
        )

        result = await self.db.execute(query)
        webhooks = result.scalars().all()

        for webhook in webhooks:
            if event_type in webhook.events:
                delivery = WebhookDelivery(
                    webhook_id=webhook.id,
                    event_type=event_type,
                    payload=payload,
                    status="pending"
                )

                self.db.add(delivery)
                await self.db.commit()
                await self.db.refresh(delivery)

                from app.tasks.webhooks import send_webhook
                send_webhook.delay(str(delivery.id))

    async def send_webhook_delivery(self, delivery_id: UUID) -> bool:
        query = select(WebhookDelivery).where(WebhookDelivery.id == delivery_id)
        result = await self.db.execute(query)
        delivery = result.scalar_one_or_none()

        if not delivery:
            return False

        webhook_query = select(Webhook).where(Webhook.id == delivery.webhook_id)
        webhook_result = await self.db.execute(webhook_query)
        webhook = webhook_result.scalar_one_or_none()

        if not webhook or not webhook.is_active:
            delivery.status = "failed"
            delivery.error_message = "Webhook is inactive or not found"
            await self.db.commit()
            return False

        import json
        payload_str = json.dumps(delivery.payload)
        signature = self.generate_signature(payload_str, webhook.secret_key)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": delivery.event_type,
            "X-Webhook-Delivery-Id": str(delivery.id)
        }

        delivery.attempts += 1
        delivery.last_attempt_at = datetime.utcnow()

        try:
            async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
                response = await client.post(
                    webhook.url,
                    json=delivery.payload,
                    headers=headers
                )

                delivery.response_code = response.status_code
                delivery.response_body = response.text[:1000]

                if 200 <= response.status_code < 300:
                    delivery.status = "delivered"
                    delivery.delivered_at = datetime.utcnow()
                    await self.db.commit()
                    return True
                else:
                    delivery.status = "failed"
                    delivery.error_message = f"HTTP {response.status_code}: {response.text[:200]}"

        except Exception as e:
            delivery.status = "failed"
            delivery.error_message = str(e)[:500]

        if delivery.attempts < webhook.retry_count:
            delay_minutes = 2 ** delivery.attempts
            delivery.next_retry_at = datetime.utcnow() + timedelta(minutes=delay_minutes)
            delivery.status = "pending"

            from app.tasks.webhooks import retry_webhook
            retry_webhook.apply_async(args=[str(delivery.id)], countdown=delay_minutes * 60)

        await self.db.commit()
        return False

    async def test_webhook(self, webhook_id: UUID, test_payload: Dict[str, Any]) -> Dict[str, Any]:
        query = select(Webhook).where(Webhook.id == webhook_id)
        result = await self.db.execute(query)
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise ValueError("Webhook not found")

        import json
        payload_str = json.dumps(test_payload)
        signature = self.generate_signature(payload_str, webhook.secret_key)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": "test",
            "X-Webhook-Test": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
                response = await client.post(
                    webhook.url,
                    json=test_payload,
                    headers=headers
                )

                return {
                    "success": 200 <= response.status_code < 300,
                    "status_code": response.status_code,
                    "response": response.text[:500]
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
