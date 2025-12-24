import os
import json
import logging
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class TaskService:
    def __init__(self):
        self.project = os.getenv("GCS_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = os.getenv("CLOUD_TASKS_LOCATION")
        self.queue = os.getenv("CLOUD_TASKS_QUEUE")
        
        try:
            self.client = tasks_v2.CloudTasksClient()
            self.parent = self.client.queue_path(self.project, self.location, self.queue)
        except Exception as e:
            logger.warning(f"Could not initialize Cloud Tasks client: {e}")
            self.client = None

    def create_analysis_task(
        self,
        user_id: str,
        gcs_uri: str,
        content_type: str,
        original_filename: str,
        config: Dict[str, Any],
        webhook_url: str,
        webhook_secret: Optional[str] = None
    ):
        if not self.client:
            raise Exception("Cloud Tasks client not initialized")

        # The URL where the worker endpoint is hosted
        # This should be the full internal or external URL of the Cloud Run service
        worker_url = os.getenv("TASK_WORKER_URL")
        if not worker_url:
            raise Exception("TASK_WORKER_URL environment variable is not set")

        # Construct the request body
        payload = {
            "user_id": user_id,
            "gcs_uri": gcs_uri,
            "content_type": content_type,
            "original_filename": original_filename,
            "config": config,
            "webhook_url": webhook_url,
            "webhook_secret": webhook_secret
        }

        # Convert payload to bytes
        body = json.dumps(payload).encode()

        # Construct the task
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"{worker_url.rstrip('/')}/v1/tasks/process-audio",
                "headers": {"Content-Type": "application/json"},
                "body": body,
            }
        }

        # Optional: Add OIDC token for authentication if running on Cloud Run
        # This allows the worker endpoint to be "internal-only" or require auth
        if os.getenv("K_SERVICE"): # Check if running in Cloud Run
            task["http_request"]["oidc_token"] = {
                "service_account_email": os.getenv("GCP_SERVICE_ACCOUNT_EMAIL")
            }

        try:
            response = self.client.create_task(request={"parent": self.parent, "task": task})
            logger.info(f"✅ Created Cloud Task: {response.name}")
            return response.name
        except Exception as e:
            logger.error(f"❌ Failed to create Cloud Task: {e}")
            raise e

task_service = TaskService()
