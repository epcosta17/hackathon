import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ValuePropsGrid } from './components/ValuePropsGrid';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';

export default function App() {
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