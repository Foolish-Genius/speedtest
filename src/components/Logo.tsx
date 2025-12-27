export function SpeedLabLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8"
    >
      <defs>
        <linearGradient id="speedLabGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F58F7C" />
          <stop offset="50%" stopColor="#F2A098" />
          <stop offset="100%" stopColor="#F2C4CE" />
        </linearGradient>
        <linearGradient id="glowGradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background with rounded square */}
      <rect width="32" height="32" rx="7" fill="url(#speedLabGradient)" />
      
      {/* Subtle top highlight */}
      <rect width="32" height="12" rx="7" fill="url(#glowGradient)" />

      {/* Central circle element */}
      <circle cx="16" cy="16" r="10" fill="rgba(255,255,255,0.15)" />
      <circle cx="16" cy="16" r="8" fill="rgba(0,0,0,0.2)" />

      {/* WiFi/Signal waves radiating from center-left */}
      <g opacity="0.9">
        {/* Wave 1 - inner */}
        <path 
          d="M 10 16 Q 12 14 14 14" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          fill="none"
          opacity="0.7"
        />
        {/* Wave 2 - middle */}
        <path 
          d="M 8 16 Q 12 12 16 12" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          fill="none"
          opacity="0.85"
        />
        {/* Wave 3 - outer */}
        <path 
          d="M 6 16 Q 12 10 18 10" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          fill="none"
        />
      </g>

      {/* Speed arrow/bolt symbol in center */}
      <g transform="translate(16, 16)">
        {/* Lightning bolt shape */}
        <path
          d="M 1 -4 L -2 1 L 1 1 L -1 5 L 4 -1 L 1 -1 Z"
          fill="white"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.5"
        />
      </g>

      {/* Speed indicator dots (bottom right) */}
      <g opacity="0.8">
        <circle cx="22" cy="22" r="1" fill="white" />
        <circle cx="24" cy="20" r="0.8" fill="white" opacity="0.8" />
        <circle cx="26" cy="18" r="0.6" fill="white" opacity="0.6" />
      </g>
    </svg>
  );
}
