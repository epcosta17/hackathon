export function FinalCTA() {
  return (
    <section className="relative max-w-4xl mx-auto px-6 py-32">
      <div className="relative p-12 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 backdrop-blur-xl text-center overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
        
        <div className="relative">
          <h2 className="text-white mb-6">
            Ready to double your screening capacity?
          </h2>
          
          <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">
            Join hundreds of technical recruiters who are already saving 20+ hours per week with Interview Lens.
          </p>
          
          <button className="px-10 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-xl hover:shadow-blue-500/50 transition-all">
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
