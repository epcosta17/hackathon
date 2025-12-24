# Frontend - AI Interview Analysis Platform

Modern React frontend for the AI Interview Analysis Platform with a beautiful, responsive UI featuring audio transcription, interactive editing, and comprehensive analysis dashboards.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
  ```bash
  node --version
  npm --version
  ```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── UploadScreen.tsx       # Audio upload & interview list
│   │   ├── TranscriptEditor.tsx   # Transcript editing with notes
│   │   ├── AnalysisDashboard.tsx  # Analysis results display
│   │   └── ui/                    # shadcn/ui components
│   ├── styles/
│   │   └── globals.css           # Global styles
│   ├── App.tsx                   # Main application & routing
│   └── main.tsx                  # Application entry point
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## ✨ Features

### Upload Screen
- 📤 Drag-and-drop audio upload (MP3/WAV)
- 🔍 Search through previous interviews
- 🎵 Real-time transcription progress
- 📂 Collapsible sidebar with animations

### Transcript Editor
- ✏️ Edit transcript segments
- 🔖 Add bookmarks for key moments
- 📝 Create timestamped notes
- 🎧 Audio playback with segment highlighting
- ⚡ Auto-scroll to active segment
- 🎨 Smooth animations and transitions

### Analysis Dashboard
- 📊 Comprehensive interview analysis
- 💼 Technical skills breakdown
- 🎯 Key emphasis points
- 💬 Communication metrics
- 📈 Interactive statistics
- 💾 Save interview with custom title
- 📄 Download DOCX report

## 🎨 Tech Stack

- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library

## 🔌 Backend Integration

The frontend connects to the backend API at `http://127.0.0.1:8000`.

### API Endpoints Used

- `POST /v1/analyze` - Generate AI analysis (Sync/Async hybrid)
- `POST /v1/interviews` - Save interview
- `GET /v1/interviews` - List interviews with search
- `GET /v1/interviews/{id}` - Load specific interview
- `DELETE /v1/interviews/{id}` - Delete interview
- `POST /v1/interviews/{id}/notes` - Create note/bookmark
- `GET /v1/interviews/{id}/notes` - Get notes
- `DELETE /v1/notes/{id}` - Delete note
- `POST /v1/generate-report` - Generate DOCX
- `POST /v1/download-report` - Download report

### Starting the Backend

```bash
cd ../backend
source .venv/bin/activate
python main.py
```

## 🛠️ Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🎨 UI Components

This project uses shadcn/ui components:

- **Button** - Various styles and sizes
- **Card** - Content containers
- **Input** - Form inputs
- **Textarea** - Multi-line text input
- **Badge** - Labels and tags
- **Progress** - Loading indicators
- **Alert** - Notifications
- **Dialog** - Modal windows

All components are customizable via Tailwind CSS.

## 📱 Responsive Design

The app is optimized for:
- 💻 Desktop (1920px+)
- 💻 Laptop (1440px)
- 📱 Tablet (768px)
- 📱 Mobile (375px)

## 🎭 Animations

Using Framer Motion for:
- ✨ Page transitions
- 🔄 Component entry/exit animations
- 📜 Smooth scrolling
- 🎪 Staggered list animations
- 🌊 Hover effects

## 🚀 Building for Production

```bash
# Create optimized production build
npm run build
```

### Deployment

Deploy the `dist/` directory to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `dist/` folder
- **AWS S3**: Upload to S3 bucket with static hosting
- **Docker**: Create a Dockerfile with nginx

## 📄 License

MIT License
