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
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="speedLabGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F58F7C" />
          <stop offset="100%" stopColor="#F2C4CE" />
        </linearGradient>
      </defs>

      {/* Outer rounded square background */}
      <rect width="32" height="32" rx="8" fill="url(#speedLabGradient)" />

      {/* WiFi signal waves (left side) */}
      <g stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round">
        {/* Arc 1 - shortest */}
        <path d="M 10 18 Q 12 16 14 16" opacity="0.6" />
        {/* Arc 2 - medium */}
        <path d="M 9 20 Q 12.5 15.5 16 15.5" opacity="0.8" />
        {/* Arc 3 - longest */}
        <path d="M 8 22 Q 13 14 18 14" />
      </g>

      {/* Speedometer needle (right side) */}
      <g>
        {/* Speedometer gauge arc */}
        <path
          d="M 20 24 Q 24 20 26 16"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Needle pointing up-right (indicating speed) */}
        <line x1="22" y1="22" x2="26" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Needle pivot dot */}
        <circle cx="22" cy="22" r="1.5" fill="white" />
      </g>
    </svg>
  );
}
