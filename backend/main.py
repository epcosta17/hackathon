"""Main FastAPI application entry point."""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Import database initialization
from database import init_db

# Import Firebase initialization
from services.auth_service import initialize_firebase

# Import routers
from routes import transcription, analysis, interviews, notes, auth

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
app.include_router(transcription.router)
app.include_router(analysis.router)
app.include_router(interviews.router)
app.include_router(notes.router)


# Initialize database and Firebase on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and Firebase on app startup"""
    init_db()
    print("✅ Database initialized")
    
    initialize_firebase()
    print("✅ Firebase Admin SDK initialized")


# --- Uvicorn Runner ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
