from celery import Task
from datetime import datetime, timedelta
from typing import Dict, List, Any
import hashlib
from uuid import UUID

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.models.screenshot import Screenshot
from app.services.storage_service import BackblazeService
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


@celery_app.task(name="process_screenshot_deduplication", base=AsyncTask, bind=True)
async def process_screenshot_deduplication(self, organization_id: str, batch_size: int = 100) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        query = select(Screenshot).where(
            and_(
                Screenshot.organization_id == UUID(organization_id),
                Screenshot.is_deleted == False
            )
        ).order_by(Screenshot.created_at).limit(batch_size)

        result = await db.execute(query)
        screenshots = result.scalars().all()

        storage = BackblazeService()
        duplicates_found = 0
        duplicates_deleted = 0

        file_hashes = {}

        for screenshot in screenshots:
            try:
                file_data = await storage.download_file(screenshot.file_url)
                file_hash = hashlib.sha256(file_data).hexdigest()

                if file_hash in file_hashes:
                    screenshot.is_deleted = True
                    await storage.delete_file(screenshot.file_url)
                    duplicates_found += 1
                    duplicates_deleted += 1
                else:
                    file_hashes[file_hash] = screenshot.id

            except Exception as e:
                continue

        await db.commit()

        return {
            'success': True,
            'processed': len(screenshots),
            'duplicates_found': duplicates_found,
            'duplicates_deleted': duplicates_deleted
        }


@celery_app.task(name="apply_retention_policy", base=AsyncTask, bind=True)
async def apply_retention_policy(self, organization_id: str, retention_days: int = 90) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        query = select(Screenshot).where(
            and_(
                Screenshot.organization_id == UUID(organization_id),
                Screenshot.created_at < cutoff_date,
                Screenshot.is_deleted == False
            )
        )

        result = await db.execute(query)
        screenshots = result.scalars().all()

        storage = BackblazeService()
        deleted_count = 0

        for screenshot in screenshots:
            try:
                await storage.delete_file(screenshot.file_url)
                screenshot.is_deleted = True
                deleted_count += 1
            except Exception as e:
                continue

        await db.commit()

        return {
            'success': True,
            'deleted_count': deleted_count,
            'retention_days': retention_days,
            'cutoff_date': cutoff_date.isoformat()
        }


@celery_app.task(name="compress_screenshots", base=AsyncTask, bind=True)
async def compress_screenshots(self, screenshot_ids: List[str]) -> Dict[str, Any]:
    from PIL import Image
    import io

    async with AsyncSessionLocal() as db:
        query = select(Screenshot).where(
            Screenshot.id.in_([UUID(sid) for sid in screenshot_ids])
        )

        result = await db.execute(query)
        screenshots = result.scalars().all()

        storage = BackblazeService()
        compressed_count = 0
        total_saved_bytes = 0

        for screenshot in screenshots:
            try:
                file_data = await storage.download_file(screenshot.file_url)
                original_size = len(file_data)

                image = Image.open(io.BytesIO(file_data))

                output = io.BytesIO()
                image.save(output, format='JPEG', quality=85, optimize=True)
                compressed_data = output.getvalue()
                compressed_size = len(compressed_data)

                if compressed_size < original_size:
                    await storage.delete_file(screenshot.file_url)

                    upload_result = await storage.upload_file(
                        file_data=compressed_data,
                        filename=screenshot.filename,
                        content_type='image/jpeg',
                        folder='screenshots'
                    )

                    screenshot.file_url = upload_result['file_url']
                    compressed_count += 1
                    total_saved_bytes += (original_size - compressed_size)

            except Exception as e:
                continue

        await db.commit()

        return {
            'success': True,
            'compressed_count': compressed_count,
            'total_saved_bytes': total_saved_bytes,
            'total_saved_mb': round(total_saved_bytes / (1024 * 1024), 2)
        }


@celery_app.task(name="cleanup_orphaned_screenshots", base=AsyncTask, bind=True)
async def cleanup_orphaned_screenshots(self, organization_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        query = select(Screenshot).where(
            and_(
                Screenshot.organization_id == UUID(organization_id),
                Screenshot.session_id == None,
                Screenshot.created_at < datetime.utcnow() - timedelta(days=7)
            )
        )

        result = await db.execute(query)
        orphaned_screenshots = result.scalars().all()

        storage = BackblazeService()
        deleted_count = 0

        for screenshot in orphaned_screenshots:
            try:
                await storage.delete_file(screenshot.file_url)
                await db.delete(screenshot)
                deleted_count += 1
            except Exception as e:
                continue

        await db.commit()

        return {
            'success': True,
            'deleted_count': deleted_count
        }
