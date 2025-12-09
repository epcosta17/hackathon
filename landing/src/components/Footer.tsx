import { FileAudio } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0F1115] relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/5 pointer-events-none" />

      <div
        className="max-w-7xl mx-auto px-6 py-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 min-h-[160px]"
        style={{ minHeight: '80px' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FileAudio className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Interview Lens</span>
        </div>

        <div className="text-white/40 text-sm">
          &copy; {new Date().getFullYear()} Interview Lens. All rights reserved.
        </div>
      </div>
    </footer>
  );
}