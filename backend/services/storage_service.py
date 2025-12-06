import json
import os
from typing import Any, Dict, List, Optional
from google.cloud import storage
from google.oauth2 import service_account
from datetime import datetime, timezone

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

    def upload_file(self, path: str, file_obj, content_type: str = None, callback=None) -> str:
        """
        Uploads a file object to GCS.
        Args:
           path: GCS destination path
           file_obj: File-like object to upload
           content_type: MIME type
           callback: Optional function(uploaded_bytes: int) -> None
        """
        self._check_client()
        blob = self.bucket.blob(path)

        if callback:
            # Wrapper to intercept read() calls for progress tracking
            class ProgressFileReader:
                def __init__(self, file, progress_callback):
                    self.file = file
                    self.callback = progress_callback
                    self.total_read = 0

                def read(self, size=-1):
                    data = self.file.read(size)
                    if data:
                        self.total_read += len(data)
                        self.callback(self.total_read)
                    return data
                
                # Proxy other methods
                def __getattr__(self, name):
                    return getattr(self.file, name)
            
            file_obj = ProgressFileReader(file_obj, callback)

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

    def cleanup_temp_files(self, user_id: str, max_age_hours: int = 2):
        """
        Deletes files in {user_id}/temp_audio/ that are older than max_age_hours.
        Returns the count of deleted files.
        """
        self._check_client()
        prefix = f"{user_id}/temp_audio/"
        blobs = self.bucket.list_blobs(prefix=prefix)
        
        count = 0
        now = datetime.now(timezone.utc)
        
        print(f"🧹 [CLEANUP] Checking temp files for {user_id}...")
        
        for blob in blobs:
            # Check age
            if blob.time_created:
                age = now - blob.time_created
                age_hours = age.total_seconds() / 3600
                
                if age_hours > max_age_hours:
                    try:
                        print(f"🗑️ [CLEANUP] Deleting old temp file: {blob.name} (Age: {age_hours:.1f}h)")
                        blob.delete()
                        count += 1
                    except Exception as e:
                        print(f"⚠️ [CLEANUP] Failed to delete {blob.name}: {e}")
        
        if count > 0:
            print(f"✨ [CLEANUP] Removed {count} old temp files.")
        return count

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
        
        from datetime import timedelta
        return blob.generate_signed_url(expiration=timedelta(seconds=expiration), method='GET', version='v4')

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
