import { Mic } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0F1115]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-white">Interview Lens</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered interview intelligence for technical recruiters.
            </p>
          </div>
          
          <div>
            <h4 className="text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Demo</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">API</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 text-center text-gray-400 text-sm">
          © 2025 Interview Lens. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
