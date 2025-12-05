export function DoodleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Original Doodles */}
      <svg className="absolute top-10 left-10 w-32 h-32 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
        <path d="M30 50 Q40 30 50 50 T70 50" />
        <circle cx="50" cy="50" r="8" fill="currentColor" />
      </svg>
      
      <svg className="absolute bottom-20 right-20 w-40 h-40 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="30" width="60" height="40" rx="5" strokeDasharray="3 3" />
        <circle cx="35" cy="50" r="5" fill="currentColor" />
        <circle cx="50" cy="50" r="5" fill="currentColor" />
        <circle cx="65" cy="50" r="5" fill="currentColor" />
        <path d="M15 50 L10 50 M90 50 L85 50" strokeLinecap="round" />
      </svg>
      
      <svg className="absolute top-1/3 right-10 w-24 h-24 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 70 L30 30 L50 30 C60 30 65 35 65 45 C65 55 60 60 50 60 L30 60" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="72" cy="45" r="3" fill="currentColor" />
        <circle cx="72" cy="55" r="3" fill="currentColor" />
      </svg>
      
      <svg className="absolute bottom-1/4 left-20 w-28 h-28 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 80 Q20 50 40 50 T60 50 T80 50" strokeDasharray="5 5" />
        <circle cx="40" cy="50" r="6" fill="currentColor" />
        <circle cx="60" cy="50" r="6" fill="currentColor" />
        <path d="M30 30 L50 20 L70 30" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      
      {/* Microphone */}
      <svg className="absolute top-20 right-1/4 w-20 h-20 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="35" y="20" width="30" height="40" rx="15" />
        <path d="M20 50 Q20 75 50 75 Q80 75 80 50" />
        <line x1="50" y1="75" x2="50" y2="90" />
        <line x1="35" y1="90" x2="65" y2="90" />
      </svg>
      
      {/* Headphones */}
      <svg className="absolute bottom-32 left-1/4 w-24 h-24 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 50 Q20 20 50 20 Q80 20 80 50" />
        <rect x="15" y="50" width="12" height="20" rx="3" />
        <rect x="73" y="50" width="12" height="20" rx="3" />
      </svg>
      
      {/* Sound Waves */}
      <svg className="absolute top-1/2 left-10 w-32 h-32 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 50 L20 40 L30 60 L40 30 L50 70 L60 35 L70 65 L80 45 L90 50" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 35 L20 28 L30 42 L40 20 L50 55 L60 25 L70 50 L80 32 L90 40" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
      
      {/* Quote marks */}
      <svg className="absolute top-40 left-1/3 w-16 h-16 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="currentColor">
        <path d="M20 60 Q20 30 35 30 L35 45 Q25 45 25 60 Z" />
        <path d="M55 60 Q55 30 70 30 L70 45 Q60 45 60 60 Z" />
      </svg>
      
      {/* Document/Notes */}
      <svg className="absolute bottom-40 right-1/3 w-20 h-20 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 10 L70 10 L70 30 L85 30 L85 90 L30 90 Z" />
        <line x1="40" y1="40" x2="75" y2="40" strokeDasharray="3 2" />
        <line x1="40" y1="55" x2="75" y2="55" strokeDasharray="3 2" />
        <line x1="40" y1="70" x2="60" y2="70" strokeDasharray="3 2" />
      </svg>
      
      {/* Chat Bubble */}
      <svg className="absolute top-2/3 right-16 w-24 h-24 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="20" width="60" height="45" rx="8" />
        <path d="M40 65 L35 75 L45 65 Z" fill="currentColor" />
        <circle cx="35" cy="42" r="3" fill="currentColor" />
        <circle cx="50" cy="42" r="3" fill="currentColor" />
        <circle cx="65" cy="42" r="3" fill="currentColor" />
      </svg>
      
      {/* Play Button */}
      <svg className="absolute bottom-1/3 left-1/2 w-16 h-16 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="35" />
        <path d="M40 32 L40 68 L68 50 Z" fill="currentColor" />
      </svg>
      
      {/* Clock/Timer */}
      <svg className="absolute top-1/4 left-1/2 w-20 h-20 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="30" />
        <line x1="50" y1="50" x2="50" y2="30" strokeLinecap="round" />
        <line x1="50" y1="50" x2="65" y2="55" strokeLinecap="round" />
      </svg>
      
      {/* Stars/Sparkles */}
      <svg className="absolute top-1/2 right-1/3 w-12 h-12 text-[#6366f1]/10" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 10 L55 40 L85 45 L60 60 L65 90 L50 75 L35 90 L40 60 L15 45 L45 40 Z" />
      </svg>
      
      {/* Brain/AI */}
      <svg className="absolute bottom-12 left-1/3 w-20 h-20 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 40 Q30 20 50 20 Q70 20 70 40 Q75 40 75 50 Q75 60 70 60 Q70 80 50 80 Q30 80 30 60 Q25 60 25 50 Q25 40 30 40" />
        <circle cx="40" cy="45" r="2" fill="currentColor" />
        <circle cx="60" cy="45" r="2" fill="currentColor" />
        <path d="M35 60 Q50 70 65 60" strokeLinecap="round" />
      </svg>
      
      {/* Text Lines */}
      <svg className="absolute top-12 right-1/2 w-24 h-24 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="20" y1="30" x2="80" y2="30" strokeLinecap="round" />
        <line x1="20" y1="50" x2="70" y2="50" strokeLinecap="round" />
        <line x1="20" y1="70" x2="75" y2="70" strokeLinecap="round" />
        <circle cx="15" cy="30" r="3" fill="currentColor" />
        <circle cx="15" cy="50" r="3" fill="currentColor" />
        <circle cx="15" cy="70" r="3" fill="currentColor" />
      </svg>
      
      {/* Waveform */}
      <svg className="absolute bottom-10 right-1/2 w-28 h-28 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="15" y1="50" x2="15" y2="30" strokeLinecap="round" />
        <line x1="25" y1="50" x2="25" y2="20" strokeLinecap="round" />
        <line x1="35" y1="50" x2="35" y2="40" strokeLinecap="round" />
        <line x1="45" y1="50" x2="45" y2="15" strokeLinecap="round" />
        <line x1="55" y1="50" x2="55" y2="35" strokeLinecap="round" />
        <line x1="65" y1="50" x2="65" y2="25" strokeLinecap="round" />
        <line x1="75" y1="50" x2="75" y2="40" strokeLinecap="round" />
        <line x1="85" y1="50" x2="85" y2="30" strokeLinecap="round" />
        <line x1="15" y1="50" x2="15" y2="70" strokeLinecap="round" />
        <line x1="25" y1="50" x2="25" y2="80" strokeLinecap="round" />
        <line x1="35" y1="50" x2="35" y2="60" strokeLinecap="round" />
        <line x1="45" y1="50" x2="45" y2="85" strokeLinecap="round" />
        <line x1="55" y1="50" x2="55" y2="65" strokeLinecap="round" />
        <line x1="65" y1="50" x2="65" y2="75" strokeLinecap="round" />
        <line x1="75" y1="50" x2="75" y2="60" strokeLinecap="round" />
        <line x1="85" y1="50" x2="85" y2="70" strokeLinecap="round" />
      </svg>
      
      {/* Recording Icon */}
      <svg className="absolute top-3/4 left-1/4 w-16 h-16 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="20" fill="currentColor" />
        <circle cx="50" cy="50" r="30" strokeDasharray="5 5" />
      </svg>
      
      {/* Folder */}
      <svg className="absolute top-16 left-2/3 w-20 h-20 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 30 L15 80 L85 80 L85 30 L55 30 L50 20 L15 20 Z" strokeLinejoin="round" />
      </svg>
      
      {/* Volume/Speaker */}
      <svg className="absolute bottom-1/2 right-1/4 w-18 h-18 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 35 L30 65 L45 65 L60 80 L60 20 L45 35 Z" fill="currentColor" />
        <path d="M70 35 Q80 50 70 65" strokeLinecap="round" />
        <path d="M75 25 Q90 50 75 75" strokeLinecap="round" />
      </svg>
      
      {/* Tag/Label */}
      <svg className="absolute top-1/3 left-1/4 w-16 h-16 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20 L50 20 L80 50 L50 80 L20 50 Z" />
        <circle cx="35" cy="35" r="4" fill="currentColor" />
      </svg>
      
      {/* Calendar */}
      <svg className="absolute bottom-1/4 right-12 w-20 h-20 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="25" width="60" height="55" rx="5" />
        <line x1="20" y1="40" x2="80" y2="40" />
        <line x1="35" y1="15" x2="35" y2="30" strokeLinecap="round" />
        <line x1="65" y1="15" x2="65" y2="30" strokeLinecap="round" />
        <circle cx="35" cy="55" r="2" fill="currentColor" />
        <circle cx="50" cy="55" r="2" fill="currentColor" />
        <circle cx="65" cy="55" r="2" fill="currentColor" />
        <circle cx="35" cy="68" r="2" fill="currentColor" />
        <circle cx="50" cy="68" r="2" fill="currentColor" />
      </svg>
      
      {/* Checkmark List */}
      <svg className="absolute top-1/2 left-1/3 w-20 h-20 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 25 L30 35 L45 20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 50 L30 60 L45 45" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 75 L30 85 L45 70" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="55" y1="27" x2="85" y2="27" strokeLinecap="round" />
        <line x1="55" y1="52" x2="85" y2="52" strokeLinecap="round" />
        <line x1="55" y1="77" x2="85" y2="77" strokeLinecap="round" />
      </svg>
      
      {/* Search/Magnifying Glass */}
      <svg className="absolute bottom-1/3 left-12 w-18 h-18 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="40" cy="40" r="25" />
        <line x1="58" y1="58" x2="75" y2="75" strokeLinecap="round" />
      </svg>
      
      {/* Lightbulb/Idea */}
      <svg className="absolute top-1/4 right-1/3 w-18 h-18 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M50 15 Q30 15 30 40 Q30 55 40 60 L40 70 L60 70 L60 60 Q70 55 70 40 Q70 15 50 15" />
        <line x1="40" y1="75" x2="60" y2="75" />
        <line x1="42" y1="80" x2="58" y2="80" />
        <line x1="25" y1="35" x2="15" y2="35" strokeLinecap="round" />
        <line x1="75" y1="35" x2="85" y2="35" strokeLinecap="round" />
      </svg>
      
      {/* Graph/Chart */}
      <svg className="absolute bottom-16 left-2/3 w-22 h-22 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="20" y1="80" x2="80" y2="80" strokeLinecap="round" />
        <line x1="20" y1="20" x2="20" y2="80" strokeLinecap="round" />
        <rect x="30" y="55" width="10" height="25" fill="currentColor" />
        <rect x="45" y="40" width="10" height="40" fill="currentColor" />
        <rect x="60" y="30" width="10" height="50" fill="currentColor" />
      </svg>
      
      {/* User/Person */}
      <svg className="absolute top-2/3 left-12 w-16 h-16 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="35" r="15" />
        <path d="M25 75 Q25 55 50 55 Q75 55 75 75" />
      </svg>
      
      {/* Multiple Users */}
      <svg className="absolute top-3/4 right-1/3 w-20 h-20 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="35" cy="35" r="12" />
        <circle cx="65" cy="35" r="12" />
        <path d="M15 70 Q15 55 35 55 Q48 55 48 65" />
        <path d="M52 65 Q52 55 65 55 Q85 55 85 70" />
      </svg>
      
      {/* Bookmark */}
      <svg className="absolute bottom-2/3 right-2/3 w-14 h-14 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 20 L70 20 L70 85 L50 70 L30 85 Z" fill="currentColor" />
      </svg>
      
      {/* Share/Network */}
      <svg className="absolute top-5 left-1/2 w-20 h-20 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="8" fill="currentColor" />
        <circle cx="25" cy="30" r="8" fill="currentColor" />
        <circle cx="75" cy="30" r="8" fill="currentColor" />
        <circle cx="25" cy="70" r="8" fill="currentColor" />
        <circle cx="75" cy="70" r="8" fill="currentColor" />
        <line x1="50" y1="50" x2="25" y2="30" strokeDasharray="2 2" />
        <line x1="50" y1="50" x2="75" y2="30" strokeDasharray="2 2" />
        <line x1="50" y1="50" x2="25" y2="70" strokeDasharray="2 2" />
        <line x1="50" y1="50" x2="75" y2="70" strokeDasharray="2 2" />
      </svg>
      
      {/* Download/Save */}
      <svg className="absolute bottom-5 left-1/2 w-16 h-16 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="50" y1="20" x2="50" y2="60" strokeLinecap="round" />
        <path d="M35 45 L50 60 L65 45" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 70 L30 80 L70 80 L70 70" strokeLinecap="round" />
      </svg>
      
      {/* Settings/Gear */}
      <svg className="absolute top-1/2 right-2/3 w-18 h-18 text-[#6366f1]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="12" />
        <path d="M50 20 L50 30 M50 70 L50 80 M20 50 L30 50 M70 50 L80 50 M30 30 L36 36 M64 64 L70 70 M70 30 L64 36 M36 64 L30 70" strokeLinecap="round" />
      </svg>
      
      {/* Pie Chart */}
      <svg className="absolute bottom-1/2 left-2/3 w-20 h-20 text-[#8b5cf6]/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="30" />
        <path d="M50 50 L50 20 A30 30 0 0 1 73 35 Z" fill="currentColor" opacity="0.5" />
        <path d="M50 50 L73 35 A30 30 0 0 1 65 73 Z" fill="currentColor" opacity="0.3" />
      </svg>
      
      {/* NEW DENSE DOODLES - More opacity variations for depth */}
      
      {/* Pause Button */}
      <svg className="absolute top-8 right-40 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="35" />
        <rect x="35" y="30" width="8" height="40" fill="currentColor" />
        <rect x="57" y="30" width="8" height="40" fill="currentColor" />
      </svg>
      
      {/* Stop Button */}
      <svg className="absolute bottom-8 left-40 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="35" />
        <rect x="30" y="30" width="40" height="40" fill="currentColor" />
      </svg>
      
      {/* Fast Forward */}
      <svg className="absolute top-36 left-16 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20 L20 80 L50 50 Z" fill="currentColor" />
        <path d="M50 20 L50 80 L80 50 Z" fill="currentColor" />
      </svg>
      
      {/* Rewind */}
      <svg className="absolute bottom-36 right-16 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M80 20 L80 80 L50 50 Z" fill="currentColor" />
        <path d="M50 20 L50 80 L20 50 Z" fill="currentColor" />
      </svg>
      
      {/* Email */}
      <svg className="absolute top-44 right-8 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="15" y="25" width="70" height="50" rx="5" />
        <path d="M15 25 L50 55 L85 25" />
      </svg>
      
      {/* Notification Bell */}
      <svg className="absolute bottom-44 left-8 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M50 20 L50 25 M35 75 Q35 85 50 85 Q65 85 65 75" strokeLinecap="round" />
        <path d="M50 25 Q30 25 30 45 L30 65 L25 70 L75 70 L70 65 L70 45 Q70 25 50 25" />
      </svg>
      
      {/* Link Chain */}
      <svg className="absolute top-52 left-44 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M40 30 L30 30 Q20 30 20 40 L20 50 Q20 60 30 60 L40 60" strokeLinecap="round" />
        <path d="M60 70 L70 70 Q80 70 80 60 L80 50 Q80 40 70 40 L60 40" strokeLinecap="round" />
        <line x1="40" y1="50" x2="60" y2="50" strokeLinecap="round" />
      </svg>
      
      {/* Upload */}
      <svg className="absolute bottom-52 right-44 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="50" y1="70" x2="50" y2="30" strokeLinecap="round" />
        <path d="M35 45 L50 30 L65 45" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 80 L30 70 L70 70 L70 80" strokeLinecap="round" />
      </svg>
      
      {/* Eye/View */}
      <svg className="absolute top-28 right-2/3 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 50 Q30 30 50 30 Q70 30 90 50 Q70 70 50 70 Q30 70 10 50" />
        <circle cx="50" cy="50" r="12" fill="currentColor" />
      </svg>
      
      {/* Heart */}
      <svg className="absolute bottom-28 left-2/3 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M50 75 Q25 55 25 40 Q25 25 35 25 Q45 25 50 35 Q55 25 65 25 Q75 25 75 40 Q75 55 50 75" fill="currentColor" />
      </svg>
      
      {/* Pencil/Edit */}
      <svg className="absolute top-60 left-28 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 80 L20 65 L60 25 L75 40 L35 80 Z" />
        <line x1="55" y1="30" x2="70" y2="45" />
      </svg>
      
      {/* Trash/Delete */}
      <svg className="absolute bottom-60 right-28 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="30" y1="25" x2="70" y2="25" strokeLinecap="round" />
        <path d="M35 25 L35 20 L65 20 L65 25" />
        <path d="M35 30 L40 80 L60 80 L65 30 Z" />
      </svg>
      
      {/* Lock */}
      <svg className="absolute top-3/4 right-2/3 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="30" y="45" width="40" height="35" rx="5" />
        <path d="M35 45 L35 35 Q35 20 50 20 Q65 20 65 35 L65 45" />
        <circle cx="50" cy="62" r="4" fill="currentColor" />
      </svg>
      
      {/* Unlock */}
      <svg className="absolute bottom-3/4 left-3/4 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="30" y="45" width="40" height="35" rx="5" />
        <path d="M35 45 L35 35 Q35 20 50 20 Q65 20 65 35 L65 30" />
        <circle cx="50" cy="62" r="4" fill="currentColor" />
      </svg>
      
      {/* Cloud */}
      <svg className="absolute top-14 left-3/4 w-18 h-18 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 60 Q30 45 45 45 Q45 30 60 30 Q75 30 75 45 Q85 45 85 55 Q85 65 75 65 L30 65 Q20 65 20 55 Q20 45 30 45" fill="currentColor" />
      </svg>
      
      {/* Database */}
      <svg className="absolute bottom-14 right-3/4 w-18 h-18 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="50" cy="25" rx="30" ry="10" />
        <path d="M20 25 L20 75 Q20 85 50 85 Q80 85 80 75 L80 25" />
        <ellipse cx="50" cy="75" rx="30" ry="10" />
      </svg>
      
      {/* Phone */}
      <svg className="absolute top-2/3 right-3/4 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 15 L45 30 L40 35 Q35 40 50 55 Q65 70 70 65 L75 60 L90 75 Q80 90 65 85 Q40 80 20 50 Q10 30 25 20 Z" />
      </svg>
      
      {/* Monitor/Screen */}
      <svg className="absolute bottom-2/3 left-1/5 w-18 h-18 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="15" y="20" width="70" height="50" rx="3" />
        <line x1="50" y1="70" x2="50" y2="80" />
        <line x1="35" y1="80" x2="65" y2="80" />
      </svg>
      
      {/* Mobile Phone */}
      <svg className="absolute top-1/5 right-1/5 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="30" y="10" width="40" height="80" rx="5" />
        <line x1="45" y1="80" x2="55" y2="80" strokeLinecap="round" />
      </svg>
      
      {/* Tablet */}
      <svg className="absolute bottom-1/5 left-1/5 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="15" width="60" height="70" rx="5" />
        <circle cx="50" cy="77" r="3" fill="currentColor" />
      </svg>
      
      {/* Laptop */}
      <svg className="absolute top-4/5 right-1/5 w-18 h-18 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="25" y="25" width="50" height="40" rx="2" />
        <path d="M10 65 L90 65 L85 75 L15 75 Z" />
      </svg>
      
      {/* Camera */}
      <svg className="absolute top-1/6 left-1/6 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="30" width="60" height="45" rx="5" />
        <circle cx="50" cy="52" r="15" />
        <rect x="40" y="20" width="20" height="10" rx="2" />
      </svg>
      
      {/* Video Camera */}
      <svg className="absolute bottom-1/6 right-1/6 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="15" y="30" width="45" height="40" rx="5" />
        <path d="M60 45 L80 35 L80 65 L60 55" />
      </svg>
      
      {/* Trophy */}
      <svg className="absolute top-3/5 left-3/5 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M35 20 L35 35 Q35 50 50 50 Q65 50 65 35 L65 20" />
        <line x1="30" y1="20" x2="70" y2="20" strokeLinecap="round" />
        <path d="M35 25 L30 25 Q20 25 20 35 Q20 40 25 40" />
        <path d="M65 25 L70 25 Q80 25 80 35 Q80 40 75 40" />
        <line x1="50" y1="50" x2="50" y2="65" />
        <line x1="40" y1="65" x2="60" y2="65" />
      </svg>
      
      {/* Flag */}
      <svg className="absolute bottom-3/5 right-3/5 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="25" y1="20" x2="25" y2="85" strokeLinecap="round" />
        <path d="M25 20 L70 30 L70 55 L25 45 Z" fill="currentColor" />
      </svg>
      
      {/* Target */}
      <svg className="absolute top-2/5 right-4/5 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="35" />
        <circle cx="50" cy="50" r="25" />
        <circle cx="50" cy="50" r="15" />
        <circle cx="50" cy="50" r="5" fill="currentColor" />
      </svg>
      
      {/* Compass */}
      <svg className="absolute bottom-2/5 left-4/5 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="35" />
        <path d="M50 20 L55 45 L50 50 L45 45 Z" fill="currentColor" />
        <path d="M50 80 L45 55 L50 50 L55 55 Z" fill="currentColor" />
      </svg>
      
      {/* Pin/Location */}
      <svg className="absolute top-1/3 right-4/5 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M50 20 Q35 20 35 35 Q35 50 50 70 Q65 50 65 35 Q65 20 50 20" />
        <circle cx="50" cy="35" r="8" fill="currentColor" />
      </svg>
      
      {/* Map */}
      <svg className="absolute bottom-1/3 left-4/5 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 30 L35 25 L35 75 L20 80 Z" />
        <path d="M35 25 L65 35 L65 85 L35 75 Z" />
        <path d="M65 35 L80 30 L80 80 L65 85 Z" />
      </svg>
      
      {/* Briefcase */}
      <svg className="absolute top-4/6 left-5/6 w-16 h-16 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="35" width="60" height="45" rx="5" />
        <path d="M35 35 L35 30 Q35 20 50 20 Q65 20 65 30 L65 35" />
        <line x1="20" y1="50" x2="80" y2="50" />
      </svg>
      
      {/* Gift */}
      <svg className="absolute bottom-4/6 right-5/6 w-16 h-16 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="30" y="40" width="40" height="40" rx="2" />
        <rect x="25" y="30" width="50" height="10" rx="2" />
        <line x1="50" y1="30" x2="50" y2="80" />
        <path d="M50 30 Q40 20 35 25 Q30 30 40 30" />
        <path d="M50 30 Q60 20 65 25 Q70 30 60 30" />
      </svg>
      
      {/* Shopping Cart */}
      <svg className="absolute top-5/6 right-2/3 w-14 h-14 text-[#8b5cf6]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M25 25 L35 25 L45 65 L75 65" strokeLinejoin="round" />
        <circle cx="50" cy="75" r="5" fill="currentColor" />
        <circle cx="70" cy="75" r="5" fill="currentColor" />
        <path d="M45 30 L75 30 L72 55 L48 55 Z" />
      </svg>
      
      {/* Coffee */}
      <svg className="absolute bottom-5/6 left-2/3 w-14 h-14 text-[#6366f1]/8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 35 L30 65 Q30 75 50 75 Q70 75 70 65 L70 35" />
        <line x1="25" y1="35" x2="75" y2="35" strokeLinecap="round" />
        <path d="M70 45 L75 45 Q82 45 82 52 Q82 59 75 59 L70 59" />
        <line x1="40" y1="20" x2="40" y2="28" strokeLinecap="round" />
        <line x1="50" y1="20" x2="50" y2="28" strokeLinecap="round" />
        <line x1="60" y1="20" x2="60" y2="28" strokeLinecap="round" />
      </svg>
      
      {/* Additional scattered doodles for more density */}
      <svg className="absolute top-1/6 right-2/5 w-12 h-12 text-[#6366f1]/6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="50" cy="50" r="25" strokeDasharray="3 3" />
      </svg>
      
      <svg className="absolute bottom-1/6 left-2/5 w-12 h-12 text-[#8b5cf6]/6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M30 50 L50 30 L70 50 L50 70 Z" />
      </svg>
      
      <svg className="absolute top-2/6 left-3/5 w-10 h-10 text-[#6366f1]/6" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="8" />
      </svg>
      
      <svg className="absolute bottom-2/6 right-3/5 w-10 h-10 text-[#8b5cf6]/6" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 20 L60 40 L80 40 L65 55 L70 75 L50 60 L30 75 L35 55 L20 40 L40 40 Z" />
      </svg>
      
      <svg className="absolute top-3/6 right-1/6 w-12 h-12 text-[#6366f1]/6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="30" y="30" width="40" height="40" rx="5" strokeDasharray="4 4" />
      </svg>
      
      <svg className="absolute bottom-3/6 left-1/6 w-12 h-12 text-[#8b5cf6]/6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 50 L35 30 L50 50 L65 35 L80 50" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
