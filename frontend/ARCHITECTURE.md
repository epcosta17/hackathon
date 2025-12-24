# Frontend Architecture

## Overview

The frontend is a modern React application built with TypeScript, Vite, and Tailwind CSS. It follows a component-based architecture with centralized state management and elegant animations using Framer Motion.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast HMR, optimized builds)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: React hooks (`useState`, `useEffect`, `useRef`)
- **HTTP Client**: Native `fetch` API
- **Audio**: HTML5 `<audio>` element with custom controls

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser                                   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      App.tsx (Root)                           │ │
│  │  - Screen routing (upload/editor/analysis)                    │ │
│  │  - Global state management                                    │ │
│  │  - Data flow orchestration                                    │ │
│  └───┬─────────────────┬─────────────────┬────────────────────────┘ │
│      │                 │                 │                          │
│      ▼                 ▼                 ▼                          │
│  ┌─────────┐     ┌─────────────┐   ┌──────────────┐               │
│  │ Upload  │     │ Transcript  │   │  Analysis    │               │
│  │ Screen  │     │   Editor    │   │  Dashboard   │               │
│  └────┬────┘     └──────┬──────┘   └──────┬───────┘               │
│       │                 │                 │                         │
│       │                 │                 │                         │
│  ┌────▼─────────────────▼─────────────────▼────────┐               │
│  │           Shared UI Components                  │               │
│  │  - Button, Input, Dialog, Card, etc.            │               │
│  │  - Custom: TranscriptEditor, AnalysisDashboard  │               │
│  └─────────────────────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ HTTP/REST + WebSockets (Hybrid)
                              ▼
                    ┌──────────────────────┐
                    │   Backend API        │
                    │  (FastAPI)           │
                    └──────────────────────┘
```

## Directory Structure

```
frontend/
├── src/
│   │
│   ├── main.tsx                    # Entry point, renders App
│   ├── App.tsx                     # Root component with routing logic
│   │
│   ├── components/
│   │   ├── UploadScreen.tsx       # Audio upload + interview list
│   │   ├── TranscriptEditor.tsx   # Main editor with audio player
│   │   ├── AnalysisDashboard.tsx  # Analysis results & report download
│   │   │
│   │   ├── ui/                     # shadcn/ui components (Button, Input, etc.)
│   │   │
│   │   └── figma/
│   │       └── ImageWithFallback.tsx
│   │
│   ├── styles/
│   │   └── globals.css            # Global styles + Tailwind imports
│   │
│   └── index.css                  # Additional base styles
│
├── index.html                     # HTML entry point
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── package.json                   # Dependencies
```

## Data Flow

### 1. New Transcription Flow

```
User uploads audio
     │
     ▼
UploadScreen
     │
     ├─► POST /v1/transcribe-stream (SSE)
     │   └─► Progress updates (0-100%)
     │
     ├─► Receives transcript blocks + waveform
     │
     └─► handleTranscriptionComplete()
         │
         ▼
App.tsx
     ├─► setTranscriptBlocks(blocks)
     ├─► setAudioFile(file)
     ├─► setWaveformData(waveform)
     └─► setCurrentScreen('editor')
```

### 2. Analysis Flow

```
User clicks "Analyze"
     │
     ▼
TranscriptEditor
     │
     ├─► POST /v1/analyze (transcript blocks)
     │   └─► Returns analysis (AI Analysis) + triggers Async Report Gen
     │
     └─► onAnalysisComplete(analysisData)
         │
         ▼
App.tsx
     ├─► setAnalysisData(analysisData)
     └─► setCurrentScreen('analysis')
         │
         ▼
AnalysisDashboard
     └─► Displays:
         - Key Findings (Accordions)
         - Skills Assessment
         - Metrics
```

## State Management

### Global State (App.tsx)

```typescript
// Screen navigation
const [currentScreen, setCurrentScreen] = useState<'upload' | 'editor' | 'analysis'>('upload');

// Transcript data
const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([]);

// Analysis results
const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

// Audio management
const [audioFile, setAudioFile] = useState<File | null>(null);
const [audioUrl, setAudioUrl] = useState<string | null>(null);

// Waveform data (from backend)
const [waveformData, setWaveformData] = useState<number[] | null>(null);
```

### Audio Streaming Strategy

**Hybrid Approach**:
1. **Instant Streaming**: Uses `http://.../v1/audio/{file}` with HTTP Range Requests for instant start.
2. **Background Prefetch**: Downloads the full blob in parallel chunks for seek-performance after load.

## Key Design Patterns

### 1. **Lifting State Up**
- Global state in `App.tsx` allows smooth transitions between Upload -> Editor -> Analysis screens while preserving data.

### 2. **Component Composition**
- Each screen is composed of smaller, reusable UI primitives (shadcn/ui).

### 3. **Optimistic UI**
- UI updates immediately on user actions (e.g., creating a note), assuming success, for a snappy feel.

## Future Improvements

### 1. **Real-time Collaboration**
- WebSocket integration for multi-user editing.

### 2. **State Management Library**
- As complexity grows, migrate to **Zustand** or **Redux Toolkit** to avoid prop drilling.

### 3. **Virtualization**
- Implement `react-window` for extremely long transcripts (1hr+).
