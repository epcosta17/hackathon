import { FileAudio } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0F1115]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Interview Lens</span>
          </div>

          <div className="text-gray-400 text-sm">
            © 2025 Interview Lens. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
