import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
    {
        question: "How do interview credits work?",
        answer: "One credit equals one analyzed interview. You can purchase credits in packs (Starter or Pro). Credits are deducted only when you successfully process an uploaded interview. They never expire."
    },
    {
        question: "What audio formats do you support?",
        answer: "We support all common audio formats including MP3, WAV, M4A, and AAC. Files are automatically converted and optimized for transcription upon upload."
    },
    {
        question: "Is the data secure?",
        answer: "Yes. We use enterprise-grade encryption for all data in transit and at rest. Your interview recordings and transcripts are private and only accessible by your account."
    },
    {
        question: "Can I export the analysis?",
        answer: "Absolutely. You can export the full transcript and AI analysis as a PDF report. Pro Pack users also get access to advanced export options."
    },
    {
        question: "What if I'm not satisfied with the result?",
        answer: "If our AI fails to process your audio correctly due to technical issues, we will refund the credit used. Please contact support for any specific quality concerns."
    }
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="relative max-w-4xl mx-auto px-6 pt-24 pb-32">
            <div className="text-center mb-16">
                <h2 className="text-white mb-4">Frequently Asked Questions</h2>
                <p className="text-gray-400 text-xl">Everything you need to know about Interview Lens</p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        className={`group relative rounded-lg border transition-all duration-200 overflow-hidden ${openIndex === index
                                ? 'bg-blue-500/10 border-blue-500/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {/* Accent bar on the left when active */}
                        {openIndex === index && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600" />
                        )}

                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full p-6 flex items-center justify-between text-left relative z-10"
                        >
                            <span className={`text-lg font-medium transition-colors ${openIndex === index ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                {faq.question}
                            </span>
                            {openIndex === index ? (
                                <Minus className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            ) : (
                                <Plus className="w-5 h-5 text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
                            )}
                        </button>

                        {openIndex === index && (
                            <div className="px-6 pb-6 text-gray-400 leading-relaxed animate-in slide-in-from-top-1 fade-in duration-200 relative z-10 pl-6">
                                {faq.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
