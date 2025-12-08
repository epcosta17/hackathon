"""Main FastAPI application entry point."""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import Firebase initialization
from services.auth_service import initialize_firebase

# Import routers
from routes import transcription, analysis, interviews, notes, auth, billing

# --- FastAPI Setup ---

app = FastAPI(
    title="InterviewLens API",
    description="Backend for AI-Powered Interview Analysis",
    docs_url="/",
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(auth.router)
app.include_router(auth.action_router)
app.include_router(transcription.router)
app.include_router(analysis.router)
app.include_router(interviews.router)
app.include_router(notes.router)
from routes import audio
app.include_router(audio.router)
app.include_router(billing.router)


# Initialize database and Firebase on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on app startup"""
    logger.info("Storage Service initialized (GCS)")
    
    initialize_firebase()
    logger.info("Firebase Admin SDK initialized")


# --- Uvicorn Runner ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
