from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from uuid import UUID
import secrets

from app.db.session import get_db
from app.core.dependencies import get_current_admin
from app.models.user import Profile
from app.models.webhook import Webhook, WebhookDelivery
from app.schemas.webhook import (
    WebhookCreate, WebhookUpdate, WebhookResponse,
    WebhookDeliveryResponse, WebhookTestRequest
)
from app.services.webhook_service import WebhookService

router = APIRouter()


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    secret_key = secrets.token_urlsafe(32)

    new_webhook = Webhook(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        secret_key=secret_key,
        **webhook_data.model_dump()
    )

    db.add(new_webhook)
    await db.commit()
    await db.refresh(new_webhook)

    return new_webhook


@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        Webhook.organization_id == current_user.organization_id
    ).order_by(Webhook.created_at.desc())

    result = await db.execute(query)
    webhooks = result.scalars().all()

    return webhooks


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    return webhook


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: UUID,
    webhook_data: WebhookUpdate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    for field, value in webhook_data.model_dump(exclude_unset=True).items():
        setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)

    return webhook


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def list_webhook_deliveries(
    webhook_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    webhook_query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    webhook_result = await db.execute(webhook_query)
    webhook = webhook_result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    query = select(WebhookDelivery).where(
        WebhookDelivery.webhook_id == webhook_id
    ).order_by(WebhookDelivery.created_at.desc()).limit(100)

    result = await db.execute(query)
    deliveries = result.scalars().all()

    return deliveries


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: UUID,
    test_request: WebhookTestRequest,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    test_payload = test_request.test_payload or {
        "event": test_request.event_type,
        "test": True,
        "organization_id": str(current_user.organization_id),
        "timestamp": "2024-01-01T00:00:00Z"
    }

    webhook_service = WebhookService(db)
    test_result = await webhook_service.test_webhook(webhook_id, test_payload)

    return test_result


@router.post("/{webhook_id}/regenerate-secret", response_model=WebhookResponse)
async def regenerate_webhook_secret(
    webhook_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Webhook).where(
        and_(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    webhook.secret_key = secrets.token_urlsafe(32)
    await db.commit()
    await db.refresh(webhook)

    return webhook
