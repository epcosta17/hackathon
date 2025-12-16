import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ValuePropsGrid } from './components/ValuePropsGrid';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';

import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Ping backend to warm up server
    fetch('https://api.getinterviewlens.com/v1/health', { mode: 'no-cors' })
      .catch(err => console.log('Warmup ping failed', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1115]">
      <Navigation />
      <Hero />
      <HowItWorks />
      <ValuePropsGrid />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}