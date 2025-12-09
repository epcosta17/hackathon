import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: 'General & Value Proposition',
    items: [
      {
        question: 'What is Interview Lens?',
        answer: 'Interview Lens is an AI-powered interview intelligence platform designed for technical recruiters and hiring managers. It transforms 60 minutes of interview audio into a structured executive summary, technical scores, and red flags—instantly, saving hours of review time.',
      },
      {
        question: 'Who is Interview Lens for?',
        answer: 'It is specifically built for technical recruiters, talent acquisition specialists, and engineering managers who need to quickly and objectively evaluate candidates after technical screenings and interviews.',
      },
      {
        question: 'How does it save me time?',
        answer: 'It eliminates the need to re-listen to lengthy audio recordings. You get an immediate, structured analysis, a full searchable transcript, and objective scoring metrics, allowing you to focus your expert time on decision-making, not note-taking.',
      },
    ],
  },
  {
    title: 'AI, Scoring, and Fairness',
    items: [
      {
        question: 'How accurate is the technical scoring?',
        answer: 'The Technical Depth and Communication Scores are based on objective, auditable metrics derived from the conversation\'s structure, pacing, and the complexity of technical vocabulary used. Interview Lens is an assistant, not a final decision-maker. It provides data points for the recruiter to use in their final, human-led evaluation.',
      },
      {
        question: 'Does the AI introduce bias?',
        answer: 'We prioritize fairness. Our AI focuses strictly on the technical content and communication structure of the interview. We provide the full transcript and detailed metrics so the human expert can easily audit the score and check the reasoning for themselves, ensuring all hiring decisions remain equitable.',
      },
      {
        question: 'Can I customize the analysis?',
        answer: 'Yes. In the Analysis Configuration screen, you can choose between \'Fast Analysis\' or \'Deep Analysis\' models and toggle specific report sections (like Executive Summary, Key Technical Points, Coding Challenge details) to ensure the report meets your specific hiring manager\'s needs.',
      },
    ],
  },
  {
    title: 'Technical & Billing',
    items: [
      {
        question: 'What file types are supported?',
        answer: 'Interview Lens supports the most common audio formats, including MP3 and WAV files. You can simply drag and drop your recording to start the transcription and analysis.',
      },
      {
        question: 'What are "Credits," and how do they work?',
        answer: 'Analysis is credit-based. One credit equals one full AI analysis of an interview recording. We offer cost-effective packs (e.g., Starter Pack, Pro Pack) that allow you to manage your analysis budget efficiently.',
      },
      {
        question: 'Can I review the transcript?',
        answer: 'Yes, absolutely. The platform provides a full, interactive transcript with speaker segmentation, time stamps, and the ability to add notes and bookmarks for quick review. You can also export the transcript for external use.',
      },
    ],
  },
];

function FAQAccordionItem({ question, answer, isOpen, onClick }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`relative group rounded-xl overflow-hidden transition-all duration-500 ${isOpen ? 'shadow-lg shadow-blue-500/10' : ''
      }`}>
      {/* Gradient border effect */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${isOpen ? 'opacity-100' : ''
        }`} />

      {/* Main card */}
      <div className="relative border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:from-white/[0.1] hover:to-white/[0.05] transition-all duration-300">
        <button
          onClick={onClick}
          className="w-full px-7 py-6 flex items-center justify-between text-left group/button"
        >
          <span className="text-white/90 group-hover/button:text-white transition-colors pr-8 flex items-center gap-3">
            {isOpen && (
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" />
            )}
            {question}
          </span>
          <div className="relative">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 blur-md opacity-0 group-hover/button:opacity-50 transition-opacity ${isOpen ? 'opacity-50' : ''
              }`} />
            <ChevronDown
              className={`relative w-5 h-5 text-blue-400 flex-shrink-0 transition-all duration-500 ${isOpen ? 'rotate-180 text-purple-400' : ''
                }`}
            />
          </div>
        </button>
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          <div className="px-7 pb-6 text-white/70 leading-relaxed border-t border-white/5 pt-4">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    const newOpenItems = new Set(openItems);

    if (newOpenItems.has(key)) {
      newOpenItems.delete(key);
    } else {
      newOpenItems.add(key);
    }

    setOpenItems(newOpenItems);
  };

  return (
    <section id="faq" className="py-32 px-6 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border border-blue-500/30 mb-8 backdrop-blur-xl relative group/badge">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-md opacity-0 group-hover/badge:opacity-100 transition-opacity" />
            <Sparkles className="w-4 h-4 text-blue-400 relative z-10" />
            <span className="text-sm text-blue-300 relative z-10">Frequently Asked Questions</span>
          </div>
          <h2 className="text-white mb-5 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
            Everything You Need to Know
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Get answers about Interview Lens and discover how it transforms your technical recruiting workflow.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-16">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="relative">
              {/* Category header with gradient accent */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <h3 className="text-white/90 px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                  {category.title}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              </div>
              <div className="space-y-4">
                {category.items.map((item, itemIndex) => (
                  <FAQAccordionItem
                    key={itemIndex}
                    question={item.question}
                    answer={item.answer}
                    isOpen={openItems.has(`${categoryIndex}-${itemIndex}`)}
                    onClick={() => toggleItem(categoryIndex, itemIndex)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 relative group/cta">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl opacity-50 group-hover/cta:opacity-75 transition-opacity" />

          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-xl text-center overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/10 to-blue-500/0 animate-pulse" />

            <div className="relative z-10">
              <h3 className="text-white mb-4">
                Still have questions?
              </h3>
              <p className="text-white/60 mb-8 text-lg max-w-md mx-auto">
                Our team is here to help you get started with Interview Lens and answer any questions you may have.
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 duration-300 group/btn"
              >
                <span>Contact Support</span>
                <ChevronDown className="w-4 h-4 rotate-[-90deg] group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
