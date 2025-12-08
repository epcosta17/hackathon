import uploadImage from '../assets/upload.mp4';
import reviewImage from '../assets/review.mp4';
import exportImage from '../assets/report.mp4';

const steps = [
  {
    number: '01',
    title: 'Drop & Process',
    description: 'Drag and drop your raw interview audio in any format (MP3, WAV, M4A). Our engine processes 60 minutes of conversation in under 60 seconds, eliminating the need for manual note-taking entirely.',
    image: uploadImage,
    imageAlt: 'Upload Screen showing fast processing',
    isVideo: true
  },
  {
    number: '02',
    title: 'Automated Intelligence',
    description: 'Go beyond simple transcription. The AI automatically distinguishes between interviewer and candidate, analyzing technical depth, communication clarity, and flagging potential concerns directly on the interactive waveform.',
    image: reviewImage,
    imageAlt: 'Analysis Screen highlighting candidate insights',
    isVideo: true
  },
  {
    number: '03',
    title: 'Client-Ready Reports',
    description: 'Generate polished executive summaries instantly. Get structured technical scores, behavioral insights, and key takeaways. Export to PDF or Word and send it to hiring managers without editing a single line.',
    image: exportImage,
    imageAlt: 'Professional Report Export',
    isVideo: true
  }
];

export function HowItWorks() {
  return (
    <section id="features" className="relative max-w-7xl mx-auto px-6 py-32">
      <div className="text-center mb-16">
        <h2 className="text-white mb-4">How It Works</h2>
        <p className="text-gray-400 text-xl">Three simple steps to transform your interview process</p>
      </div>

      <div className="space-y-28">
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
            <div className={index % 2 === 1 ? 'md:order-1' : ''}>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                {step.isVideo ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto"
                  >
                    <source src={step.image} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={step.image}
                    alt={step.imageAlt}
                    className="w-full h-auto"
                  />
                )}

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
