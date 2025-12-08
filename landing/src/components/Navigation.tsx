import { FileAudio } from 'lucide-react';
import { APP_URL } from '../config';

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0F1115]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FileAudio className="w-5 h-5 text-white" />
          </div>
          <span className="text-white">Interview Lens</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
            Pricing
          </a>
        </div>

        <a
          href={APP_URL}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all font-medium inline-block"
        >
          Start Analyzing Free
        </a>
      </div>
    </nav>
  );
}
