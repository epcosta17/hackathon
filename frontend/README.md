# B2B AI Talent Analysis App - Frontend

This is the frontend for the B2B AI Talent Analysis App. The original design is available at https://www.figma.com/design/oHlArZbdYorZZ6YhZPB9Tu/B2B-AI-Talent-Analysis-App.

## Prerequisites (macOS)

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)

### Installing Node.js on macOS

If you don't have Node.js installed:

```bash
# Install using Homebrew
brew install node

# Verify installation
node --version
npm --version
```

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm i
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── AnalysisDashboard.tsx  # Analysis results display
│   │   ├── TranscriptEditor.tsx   # Interactive transcript editor
│   │   ├── UploadScreen.tsx       # Audio file upload
│   │   └── ui/                    # Reusable UI components
│   ├── App.tsx                    # Main application component
│   └── main.tsx                   # Application entry point
├── index.html
└── package.json
```

## Features

- 📤 **Audio Upload**: Upload MP3 or WAV files for transcription
- ✏️ **Transcript Editor**: Edit transcripts with word-level precision
- 📊 **Analysis Dashboard**: View AI-powered talent analysis results
- 🎨 **Modern UI**: Built with React, TypeScript, and Tailwind CSS

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Connecting to Backend

The frontend expects the backend API to be running at `http://127.0.0.1:8000`.

To start the backend (in a separate terminal):

```bash
cd ../backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

See `../backend/WHISPERX_SETUP.md` for detailed backend setup instructions.

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. Check your terminal output for the actual URL.

### Cannot Connect to Backend

Make sure:
1. Backend server is running on port 8000
2. Check the terminal for any backend errors
3. Verify the API URL in your network requests

### Module Not Found Errors

Try removing and reinstalling dependencies:

```bash
rm -rf node_modules package-lock.json
npm i
```

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## License

See the main project README for license information.
  