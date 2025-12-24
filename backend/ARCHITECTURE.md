# Backend Architecture

## Overview

The backend uses a **modern, serverless-first architecture** designed for scalability and long-running AI tasks. It leverages **Google Cloud Platform** services (Firestore, Cloud Tasks, Cloud Storage) to handle heavy media processing asynchronously.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
└───────────┬──────────────────────────────────────────▲──────────────┘
            │ 1. Upload & Queue                        │ 6. Webhook / Polling
            ▼                                          │
┌────────────────────────────────────┐       ┌────────────────────────┐
│         API Gateway / Cloud Run    │       │     Cloud Tasks        │
│          (Async Endpoint)          │──────►│      (Queue)           │
└────────────────────────────────────┘       └───────────┬────────────┘
                                                         │
                                                         │ 2. Trigger Worker
                                                         ▼
                                     ┌────────────────────────────────────┐
                                     │        Worker Instance             │
                                     │   (POST /v1/tasks/process-audio)   │
                                     └──────┬────────────┬──────────┬─────┘
                                            │            │          │
                       3. Transcribe & Analyze           │          │
                      ┌─────────────────────▼──┐         │          │
                      │  External AI Services  │         │          │
                      │ - Deepgram (Audio)     │         │          │
                      │ - Vertex AI (Analysis) │         │          │
                      └────────────────────────┘         │          │
                                                         │          │
                                     4. Save Results     │          │
                      ┌──────────────────────────────────▼─┐    ┌───▼────────────┐
                      │            Firestore               │    │  Cloud Storage │
                      │ (NoSQL Interview Data & Results)   │    │ (Audio Files)  │
                      └────────────────────────────────────┘    └────────────────┘
```

## Core Workflows

### 1. Asynchronous Analysis Pipeline
**Designed for:** High reliability verification of user uploads.
1. **Ingest**: User uploads audio to `/v1/analyze-async`.
2. **Store**: Audio is immediately uploaded to **Google Cloud Storage (GCS)**.
3. **Queue**: A task is created in **Cloud Tasks**, referencing the GCS URI.
4. **Ack**: API returns "Processing" immediately to the client.
5. **Process (Worker)**:
   - Worker receives task.
   - Downloads audio from GCS.
   - Calls **Deepgram** for high-speed diarized transcription.
   - Generates waveform data (RMS normalization) server-side.
   - Calls **Vertex AI (Gemini)** to analyze text.
6. **Persist**: Complete interview object (transcript, analysis, waveform) saved to **Firestore**.
7. **Notify**: Configured webhook URL is pinged with completion status.

### 2. Synchronous/Streaming Flow (Dev/Legacy)
**Designed for:** Real-time feedback during development or short queries.
- Client opens SSE connection to `/v1/transcribe-stream`.
- Server streams bytes to local `whisper.cpp` instance.
- Transcription blocks sent back in real-time.
- **Note**: This is primarily for local testing or small files.

## Directory Structure

```
backend/
├── main.py                     # App entry point
├── database.py                 # Firestore client & DAO
├── routes/
│   ├── webhooks.py             # Cloud Task worker endpoints
│   ├── analysis.py             # Analysis & Report generation
│   ├── transcription.py        # Streaming endpoints
│   └── ...
├── services/
│   ├── task_service.py         # Cloud Tasks management
│   ├── storage_service.py      # GCS operations
│   ├── transcription_service.py # Deepgram/Whisper abstraction
│   └── ...
└── models/                     # Pydantic schemas
```

## Data Model (Firestore)

We use a hierarchical document structure in Firestore to optimize for read costs and scalability.

**Path**: `users/{userId}/interviews/{interviewId}`
- **Main Document**: High-level metadata (Title, Duration, Status, Score Summary).
- **Subcollections**:
  - `data` (Collection): Separation of heavy data chunks.
    - `transcript` (Doc): `{ words: [...], text: "..." }`
    - `analysis` (Doc): `{ keyPoints: [...], statistics: {...} }`
    - `waveform` (Doc): `{ data: [0.1, 0.5, ...] }`
  - `notes` (Collection): User-generated annotations.

*Why Subcollections?*
This ensures that listing interviews (`GET /v1/interviews`) is fast and cheap, as it only loads small metadata documents, not the multi-megabyte transcripts or waveforms.

## Key Technical Decisions

### 1. Firestore vs SQL
Switched to Firestore because:
- **Schema Flexibility**: Analysis structure varies by interview type.
- **Real-time Sync**: Ready for future real-time collaboration features.
- **Scalability**: Handles massive concurrent writes from workers without locking.

### 2. Cloud Tasks for Processing
- Decouples upload from processing.
- Automatic retries with exponential backoff for AI service failures.
- Rate limiting control (can throttle Deepgram/Gemini calls).
- **Timeout management**: HTTP requests have timeouts; Tasks can run up to 30 minutes (Cloud Run Gen 2).

### 3. Deepgram vs Local Whisper
- **Deepgram**: Used in production pipeline for speed (50x realtime) and superior distinct speaker diarization.
- **Whisper.cpp**: Retained for local development/offline capability.

### 4. Server-Side Waveform Generation
- Generated during the worker process using `numpy`.
- Stored as a normalized JSON array in Firestore.
- frontend renders instantly without processing the full audio file.
