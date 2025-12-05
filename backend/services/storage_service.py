import json
import os
from typing import Any, Dict, List, Optional
from google.cloud import storage
from google.oauth2 import service_account
from datetime import datetime

class StorageService:
    def __init__(self):
        self.bucket_name = os.getenv("GCS_BUCKET_NAME")
        self.project_id = os.getenv("GCS_PROJECT_ID")
        
        # Initialize client
        # In production (Cloud Run/App Engine), this works automatically.
        # For local dev, it looks for GOOGLE_APPLICATION_CREDENTIALS env var.
        try:
            self.client = storage.Client(project=self.project_id)
            self.bucket = self.client.bucket(self.bucket_name)
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize GCS client: {e}")
            self.client = None
            self.bucket = None

    def _check_client(self):
        if not self.client or not self.bucket:
            raise Exception("GCS Client not initialized. Check credentials and bucket name.")

    def upload_json(self, path: str, data: Any) -> str:
        """Uploads data as JSON to GCS."""
        self._check_client()
        blob = self.bucket.blob(path)
        blob.upload_from_string(
            json.dumps(data),
            content_type='application/json'
        )
        return blob.public_url

    def download_json(self, path: str) -> Optional[Any]:
        """Downloads JSON data from GCS."""
        self._check_client()
        blob = self.bucket.blob(path)
        if not blob.exists():
            return None
        
        content = blob.download_as_string()
        return json.loads(content)

    def upload_file(self, path: str, file_obj, content_type: str = None) -> str:
        """Uploads a file object to GCS."""
        self._check_client()
        blob = self.bucket.blob(path)
        blob.upload_from_file(file_obj, content_type=content_type)
        return blob.public_url

    def delete_file(self, path: str):
        """Deletes a file from GCS."""
        self._check_client()
        blob = self.bucket.blob(path)
        if blob.exists():
            blob.delete()

    def rename_file(self, old_path: str, new_path: str) -> Optional[str]:
        """Renames (moves) a file within GCS. Returns new public URL or None."""
        self._check_client()
        blob = self.bucket.blob(old_path)
        if not blob.exists():
            return None
            
        new_blob = self.bucket.rename_blob(blob, new_path)
        return new_blob.public_url

    def list_files(self, prefix: str) -> List[str]:
        """Lists files with a given prefix."""
        self._check_client()
        blobs = self.bucket.list_blobs(prefix=prefix)
        return [blob.name for blob in blobs]

    def get_file_metadata(self, path: str) -> Dict[str, Any]:
        """Gets metadata (size, content_type) for a file."""
        self._check_client()
        blob = self.bucket.get_blob(path)
        if not blob:
            return None
        return {
            'size': blob.size,
            'content_type': blob.content_type
        }

    def get_file_range(self, path: str, start: int, end: int) -> bytes:
        """Downloads a specific byte range of a file."""
        self._check_client()
        blob = self.bucket.blob(path)
        return blob.download_as_bytes(start=start, end=end)

    def download_file(self, gcs_path: str, local_path: str):
        """Downloads a file from GCS to a local path."""
        self._check_client()
        blob = self.bucket.blob(gcs_path)
        # Ensure directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        blob.download_to_filename(local_path)

    def open_file_stream(self, gcs_path: str):
        """Opens a file from GCS as a stream (file-like object)."""
        self._check_client()
        blob = self.bucket.blob(gcs_path)
        return blob.open("rb")

    def generate_signed_url(self, gcs_path: str, expiration: int = 3600) -> str:
        """Generates a signed URL for a GCS object."""
        self._check_client()
        blob = self.bucket.blob(gcs_path)
        return blob.generate_signed_url(expiration=expiration, method='GET')

    # --- Interview Specific Methods ---

    def get_index(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves the master index of interviews for a user."""
        index = self.download_json(f"{user_id}/interviews_index.json")
        return index if index else []

    def save_index(self, user_id: str, index: List[Dict[str, Any]]):
        """Saves the master index of interviews for a user."""
        self.upload_json(f"{user_id}/interviews_index.json", index)

    def add_to_index(self, user_id: str, summary: Dict[str, Any]):
        """Adds an interview summary to the user's index."""
        index = self.get_index(user_id)
        # Remove existing entry if updating
        index = [item for item in index if item['id'] != summary['id']]
        index.insert(0, summary) # Add to top
        self.save_index(user_id, index)

    def remove_from_index(self, user_id: str, interview_id: int):
        """Removes an interview from the user's index."""
        index = self.get_index(user_id)
        index = [item for item in index if item['id'] != interview_id]
        self.save_index(user_id, index)

storage_service = StorageService()
