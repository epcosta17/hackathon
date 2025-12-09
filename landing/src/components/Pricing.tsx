import { Check, Search, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Starter Pack',
    price: 5,
    credits: 5,
    pricePerInterview: 1.00,
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
    pricePerInterview: 0.75,
    description: 'For serious technical recruiters',
    badge: 'Best Value',
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
    <section id="pricing" className="relative max-w-7xl mx-auto px-6 py-32">
      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border border-blue-500/30 mb-8 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Simple, Pay-As-You-Go Pricing</span>
          </div>
          <h2 className="text-white mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
            No subscriptions. Credits never expire.
          </h2>
          <p className="text-white/60 text-xl max-w-2xl mx-auto mb-8">
            Purchase only what you need. Get 3 free credits on signup immediately.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 duration-300 ${plan.highlighted
                ? 'bg-gradient-to-br from-white/[0.12] to-white/[0.05] border-blue-500/50 shadow-2xl shadow-blue-500/20'
                : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 hover:border-white/20'
                }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-white">${plan.price}</span>
                  <span className="text-white/60">/ pack</span>
                </div>
                <div className="text-blue-400 text-sm">
                  {plan.credits} Credits (${plan.pricePerInterview.toFixed(2)} per interview)
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-white/80">
                    <Check className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://app.getinterviewlens.com"
                className={`w-full px-8 py-4 rounded-xl transition-all group block text-center ${plan.highlighted
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/50'
                  : 'border border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                  }`}
              >
                <span className="group-hover:scale-105 inline-block transition-transform">
                  {plan.cta}
                </span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}