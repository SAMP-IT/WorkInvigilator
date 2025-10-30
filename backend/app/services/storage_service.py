from b2sdk.v2 import B2Api, InMemoryAccountInfo
from datetime import datetime
from typing import Dict
import io

from app.config import settings


class BackblazeService:
    def __init__(self):
        self.info = InMemoryAccountInfo()
        self.b2_api = B2Api(self.info)
        self.b2_api.authorize_account(
            "production",
            settings.BACKBLAZE_KEY_ID,
            settings.BACKBLAZE_APPLICATION_KEY
        )
        self.bucket = self.b2_api.get_bucket_by_name(settings.BACKBLAZE_BUCKET_NAME)

    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        content_type: str,
        folder: str = "screenshots"
    ) -> Dict[str, str]:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{folder}/{timestamp}_{filename}"

        file_info = self.bucket.upload_bytes(
            data_bytes=file_data,
            file_name=unique_filename,
            content_type=content_type,
            file_infos={
                'uploaded_at': datetime.utcnow().isoformat(),
                'folder': folder
            }
        )

        download_url = self.b2_api.get_download_url_for_file_name(
            bucket_name=settings.BACKBLAZE_BUCKET_NAME,
            file_name=unique_filename
        )

        return {
            'file_url': download_url,
            'file_id': file_info.id_,
            'filename': unique_filename,
            'size_bytes': len(file_data)
        }

    async def get_download_url(self, filename: str, expires_in_hours: int = 24) -> str:
        download_auth_token = self.bucket.get_download_authorization(
            file_name_prefix=filename,
            valid_duration_in_seconds=expires_in_hours * 3600
        )

        base_url = self.b2_api.get_download_url_for_file_name(
            bucket_name=settings.BACKBLAZE_BUCKET_NAME,
            file_name=filename
        )

        return f"{base_url}?Authorization={download_auth_token}"

    async def download_file(self, file_url: str) -> bytes:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)
            response.raise_for_status()
            return response.content

    async def delete_file(self, file_url: str) -> bool:
        try:
            filename = file_url.split('/')[-1]
            file_versions = self.bucket.ls(filename, latest_only=True)

            for file_version, _ in file_versions:
                self.b2_api.delete_file_version(file_version.id_, file_version.file_name)

            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False


backblaze_service = BackblazeService()
