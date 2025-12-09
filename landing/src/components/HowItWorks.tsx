
import { Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Seamless Ingestion',
    description: 'Drag and drop your raw interview audio in any format—MP3, WAV, or M4A. Our high-throughput engine processes 60 minutes of conversation in under 60 seconds, transforming unstructured audio into structured data instantly. Eliminate manual note-taking and focus on the candidate.',
    video: '/videos/upload.mp4',
    videoAlt: 'Upload Screen'
  },
  {
    number: '02',
    title: 'Deep Signal Analysis',
    description: 'Go beyond commodity transcription. Our proprietary AI automatically diarizes speakers and performs multi-dimensional analysis: gauging technical depth, evaluating communication clarity, and flagging potential behavioral red flags directly on the interactive waveform.',
    video: '/videos/review.mp4',
    videoAlt: 'Analysis Screen with Waveform'
  },
  {
    number: '03',
    title: 'Decision-Grade Intelligence',
    description: 'Generate polished, unbiased executive summaries in seconds. Access structured technical scores, behavioral insights, and critical takeaways formatted for high-stakes decision making. Share definitive insights with hiring managers without editing a single line.',
    video: '/videos/analysis.mp4',
    videoAlt: 'Report Screen'
  }
];

export function HowItWorks() {
  return (
    <section id="features" className="relative max-w-7xl mx-auto px-6 py-32">
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border border-blue-500/30 mb-8 backdrop-blur-xl relative group/badge">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-md opacity-0 group-hover/badge:opacity-100 transition-opacity" />
          <Zap className="w-4 h-4 text-blue-400 relative z-10" />
          <span className="text-sm text-blue-300 relative z-10">How It Works</span>
        </div>
        <h2 className="text-white mb-5 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
          Three Simple Steps to Transform Your Interview Process
        </h2>
        <p className="text-white/60 text-xl max-w-2xl mx-auto">Streamlined, automated, and unbiased hiring at scale.</p>
      </div>

      <div className="space-y-16">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
          >
            {/* Text content */}
            <div className={index % 2 === 1 ? 'md:order-2' : ''}>
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 mb-6">
                Step {step.number}
              </div>

              <h3 className="text-white mb-4">{step.title}</h3>

              <p className="text-gray-400 text-lg leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Image */}
            <div className={`relative ${index % 2 === 1 ? 'md:order-1' : ''}`}>
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-2xl -z-10 rounded-full" />

              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <video
                  src={step.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-auto"
                />

                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}