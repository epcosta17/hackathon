from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/v1/health")

@router.get("/")
async def health_check():
    """
    Simple health check endpoint to wake up the server.
    """
    return JSONResponse(content={"status": "ok", "service": "interview-lens-api"}, status_code=200)
