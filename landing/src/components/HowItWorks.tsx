const uploadVideo = '/videos/upload.mp4';
const reviewVideo = '/videos/review.mp4';
const analysisVideo = '/videos/analysis.mp4';

const steps = [
  {
    number: '01',
    title: 'Seamless Ingestion',
    description: 'Drag and drop your raw interview audio in any format—MP3, WAV, or M4A. Our high-throughput engine processes 60 minutes of conversation in under 60 seconds, transforming unstructured audio into structured data instantly. Eliminate manual note-taking and focus on the candidate.',
    image: uploadVideo,
    imageAlt: 'Upload Screen showing fast processing',
    isVideo: true
  },
  {
    number: '02',
    title: 'Deep Signal Analysis',
    description: 'Go beyond commodity transcription. Our proprietary AI automatically diarizes speakers and performs multi-dimensional analysis: gauging technical depth, evaluating communication clarity, and flagging potential behavioral red flags directly on the interactive waveform.',
    image: reviewVideo,
    imageAlt: 'Analysis Screen highlighting candidate insights',
    isVideo: true
  },
  {
    number: '03',
    title: 'Decision-Grade Intelligence',
    description: 'Generate polished, unbiased executive summaries in seconds. Access structured technical scores, behavioral insights, and critical takeaways formatted for high-stakes decision making. Share definitive insights with hiring managers without editing a single line.',
    image: analysisVideo,
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

      <div>
        {steps.map((step, index) => (
          <div
            key={step.number}
            style={{ marginBottom: index === steps.length - 1 ? 0 : '64px' }}
          >
            <div
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
                <div
                  className="relative rounded-xl overflow-hidden border bg-[#0F1115]/80 backdrop-blur-xl"
                  style={{
                    borderColor: 'rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 0 60px -15px rgba(59, 130, 246, 0.6)'
                  }}
                >
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
          </div>
        ))}
      </div>
    </section>
  );
}
