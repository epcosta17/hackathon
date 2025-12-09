import { Play } from 'lucide-react';


export function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="relative">
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-white mb-6">
            Stop Re-listening to Interviews. Get Insights in Seconds.
          </h1>

          <p className="text-gray-400 text-xl mb-10 max-w-3xl mx-auto">
            The AI-powered assistant for technical recruiters. Transform 60 minutes of audio into a structured executive summary, technical scores, and red flags—instantly.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="https://app.getinterviewlens.com" className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-xl hover:shadow-blue-500/50 transition-all">
              Upload Your First Interview
            </a>
          </div>
        </div>

        {/* Hero visual - 3D tilted perspective */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative" style={{ perspective: '1500px' }}>
            <div
              className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/20"
              style={{
                transform: 'rotateX(8deg) rotateY(-8deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Glassmorphism overlay */}
              {/* Transparent overlay for slight tint, no blur */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 z-10" />

              <video
                src="/videos/hero.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto"
              />
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-3xl -z-10 scale-95" />
          </div>
        </div>
      </div>
    </section>
  );
}
