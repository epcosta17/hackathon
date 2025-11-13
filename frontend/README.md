# Frontend - AI Interview Analysis Platform

Modern React frontend for the AI Interview Analysis Platform with a beautiful, responsive UI featuring audio transcription, interactive editing, and comprehensive analysis dashboards.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
  ```bash
  brew install node
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

- `POST /api/transcribe-stream` - Audio transcription (SSE)
- `POST /api/analyze` - Generate AI analysis
- `POST /api/interviews` - Save interview
- `GET /api/interviews` - List interviews with search
- `GET /api/interviews/{id}` - Load specific interview
- `DELETE /api/interviews/{id}` - Delete interview
- `POST /api/interviews/{id}/notes` - Create note/bookmark
- `GET /api/interviews/{id}/notes` - Get notes
- `DELETE /api/notes/{id}` - Delete note
- `POST /api/generate-report` - Generate DOCX
- `POST /api/download-report` - Download report

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

### Development Workflow

1. **Hot Reload**: Changes automatically reload in the browser
2. **TypeScript**: Type checking in your editor
3. **React DevTools**: Install browser extension for debugging
4. **Console Logs**: Check browser console for errors

## 🎨 UI Components

This project uses shadcn/ui components:

- **Button** - Various styles and sizes
- **Card** - Content containers
- **Input** - Form inputs
- **Textarea** - Multi-line text input
- **Badge** - Labels and tags
- **Progress** - Loading indicators
- **Alert** - Notifications
- **Tabs** - Tabbed interfaces
- **Dialog** - Modal windows
- **Separator** - Visual dividers

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

## 🐛 Troubleshooting

### Port Already in Use
Vite automatically tries the next available port. Check terminal output for the actual URL.

### Cannot Connect to Backend
1. Verify backend is running: `curl http://127.0.0.1:8000/api/ping`
2. Check browser console for CORS errors
3. Ensure both servers are running

### Module Not Found Errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Restart TypeScript server in your editor
# Or run type checking manually
npx tsc --noEmit
```

### Build Errors
```bash
# Clean cache and rebuild
rm -rf node_modules .vite dist
npm install
npm run build
```

## 🚀 Building for Production

```bash
# Create optimized production build
npm run build

# Preview the build locally
npm run preview
```

The `dist/` directory contains the production-ready files.

### Deployment

Deploy the `dist/` directory to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `dist/` folder
- **AWS S3**: Upload to S3 bucket with static hosting
- **GitHub Pages**: Use GitHub Actions
- **Docker**: Create a Dockerfile with nginx

### Environment Variables

For production, configure the backend API URL if different from `http://127.0.0.1:8000`.

## 🎯 Key Features Implementation

### Audio Upload with Progress
- Server-Sent Events (SSE) for real-time progress
- Drag-and-drop with file validation
- Progress bar with percentage

### Transcript Editing
- Click segments to jump to timestamp
- Edit text inline
- Auto-save functionality
- Keyboard shortcuts

### Notes and Bookmarks
- Add notes at specific timestamps
- Create bookmarks for quick navigation
- Edit and delete notes
- Persistent storage via API

### Interview Management
- Search interviews by title
- Load previous interviews
- Delete interviews with confirmation
- Auto-save drafts

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)

## 📄 License

MIT License

---

**Built with ❤️ using React and TypeScript**
