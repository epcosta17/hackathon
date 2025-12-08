import { Check, Zap } from 'lucide-react';
import { useState } from 'react';

const plans = [
  {
    name: 'Trial',
    price: 0,
    period: 'free',
    description: 'Perfect for trying out Interview Lens',
    features: [
      '1 Interview Credit',
      'Basic transcription',
      'Standard export (PDF)',
      'Community support'
    ],
    cta: 'Start Free Trial',
    highlighted: false
  },
  {
    name: 'Pro',
    priceMonthly: 29,
    priceYearly: 290,
    period: 'month',
    description: 'For serious technical recruiters',
    features: [
      '15 Interview Credits per month',
      'Advanced AI analysis',
      'Technical scoring & sentiment',
      'Advanced export (PDF & Word)',
      'Priority support',
      'Unlimited search'
    ],
    cta: 'Get Started',
    highlighted: true
  },
  {
    name: 'Agency',
    price: null,
    period: 'custom',
    description: 'For teams and high-volume recruiting',
    features: [
      'Custom volume credits',
      'Team collaboration',
      'API access',
      'White-label reports',
      'Dedicated account manager',
      'Custom integrations'
    ],
    cta: 'Contact Sales',
    highlighted: false
  }
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  
  return (
    <section id="pricing" className="relative max-w-7xl mx-auto px-6 py-32">
      <div className="text-center mb-12">
        <h2 className="text-white mb-4">Simple, Transparent Pricing</h2>
        <p className="text-gray-400 text-xl mb-8">Choose the plan that fits your recruiting needs</p>
        
        {/* Toggle */}
        <div className="inline-flex items-center gap-4 p-1 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-6 py-2 rounded-full transition-all ${
              !isYearly 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-6 py-2 rounded-full transition-all ${
              isYearly 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs text-green-400">Save 17%</span>
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 mt-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-8 rounded-2xl border backdrop-blur-xl transition-all ${
              plan.highlighted
                ? 'bg-white/10 border-blue-500/50 shadow-2xl shadow-blue-500/20 scale-105'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Most Popular
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm">{plan.description}</p>
            </div>
            
            <div className="mb-6">
              {plan.price === null ? (
                <div className="text-white">Custom</div>
              ) : plan.price === 0 ? (
                <div className="text-white">Free</div>
              ) : (
                <div>
                  <span className="text-white">
                    ${isYearly && plan.priceYearly ? Math.floor(plan.priceYearly / 12) : plan.priceMonthly}
                  </span>
                  <span className="text-gray-400">/{plan.period}</span>
                  {isYearly && plan.priceYearly && (
                    <div className="text-sm text-gray-400 mt-1">
                      Billed ${plan.priceYearly} yearly
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              className={`w-full py-3 rounded-lg transition-all ${
                plan.highlighted
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50'
                  : 'border border-white/20 text-white hover:bg-white/5'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
