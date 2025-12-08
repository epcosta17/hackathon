import { Check, Zap } from 'lucide-react';
import { APP_URL } from '../config';

const plans = [
  {
    name: 'Starter Pack',
    price: 5,
    credits: 5,
    pricePerCredit: '$1.00',
    description: 'Perfect for trying out Interview Lens',
    features: [
      '5 Interview Credits',
      'Full AI Analysis',
      'Detailed Transcripts',
      'Advanced Export Options',
      'Full History Access'
    ],
    cta: 'Get Started',
    highlighted: false
  },
  {
    name: 'Pro Pack',
    price: 15,
    credits: 20,
    pricePerCredit: '$0.75',
    description: 'For serious technical recruiters',
    features: [
      '20 Interview Credits',
      'Save 25% per interview',
      'Advanced Export Options',
      'Full History Access',
      'Priority Support'
    ],
    cta: 'Get Started',
    highlighted: true
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="relative max-w-7xl mx-auto px-6 pt-48 pb-32">
      <div className="text-center mb-12">
        <h2 className="text-white mb-4">Simple, Pay-As-You-Go Pricing</h2>
        <p className="text-gray-400 text-xl mb-8">No subscriptions. Credits never expire. Purchase only what you need.</p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
          <Zap className="w-4 h-4" />
          Get 3 free credits on signup immediately
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-8 rounded-2xl border backdrop-blur-xl transition-all ${plan.highlighted
              ? 'bg-white/10 scale-105'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            style={plan.highlighted ? {
              borderColor: 'rgba(59, 130, 246, 0.4)',
              boxShadow: '0 0 60px -15px rgba(59, 130, 246, 0.5)'
            } : undefined}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Best Value
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm">{plan.description}</p>
            </div>

            <div className="mb-6">
              <div>
                <span className="text-white text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-400 ml-1">/ pack</span>
              </div>
              <div className="text-sm text-blue-400 mt-1">
                {plan.credits} Credits ({plan.pricePerCredit} per interview)
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href={APP_URL}
              className={`w-full py-3 px-6 rounded-lg transition-all inline-flex items-center justify-center text-center font-medium ${plan.highlighted
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50'
                : 'border border-white/20 text-white hover:bg-white/5'
                }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
