import { Award, Heart, Search } from 'lucide-react';

const valueProps = [
  {
    icon: Award,
    title: 'Technical Scoring',
    description: 'AI-powered evaluation of technical depth, complexity, and problem-solving skills with granular scoring across multiple dimensions.'
  },
  {
    icon: Heart,
    title: 'Sentiment Analysis',
    description: 'Real-time emotion tracking and engagement metrics. Identify enthusiasm, hesitation, and confidence levels throughout the conversation.'
  },
  {
    icon: Search,
    title: 'Instant Search',
    description: 'Jump to any topic or keyword instantly. Search through hours of interviews in seconds to find specific technical discussions or answers.'
  }
];

export function ValuePropsGrid() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-32">
      <div className="grid md:grid-cols-3 gap-8">
        {valueProps.map((prop) => {
          const Icon = prop.icon;
          return (
            <div
              key={prop.title}
              className="relative p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all group"
            >
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all" />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-white mb-3">{prop.title}</h3>

                <p className="text-gray-400 leading-relaxed">
                  {prop.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
