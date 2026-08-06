import React from 'react';

interface ConnectedLogoProps {
  className?: string;
  glow?: boolean;
}

export function ConnectedLogo({ className = 'h-10 w-10', glow = true }: ConnectedLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="Connected"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 14px rgba(233,184,84,0.35))' } : undefined}
    >
      <defs>
        <radialGradient id="cl-glow" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#f3d77c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f3d77c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cl-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9e9a8" />
          <stop offset="38%" stopColor="#ecc35a" />
          <stop offset="72%" stopColor="#c9922f" />
          <stop offset="100%" stopColor="#8f6116" />
        </linearGradient>
        <linearGradient id="cl-goldlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fdf3c4" />
          <stop offset="100%" stopColor="#e2b84e" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="104" fill="#14100a" />
      <rect width="512" height="512" rx="104" fill="url(#cl-glow)" />
      <path
        d="M256,120 C180,120 130,160 130,228 C130,272 152,308 192,322 C188,344 180,368 176,392 C172,416 186,436 208,436 C226,436 240,424 246,404 C250,394 252,388 256,384 C260,388 262,394 266,404 C272,424 286,436 304,436 C326,436 340,416 336,392 C332,368 324,344 320,322 C360,308 382,272 382,228 C382,164 332,120 256,120 Z"
        fill="url(#cl-gold)"
      />
      <path d="M256,384 L256,352" stroke="#7c5413" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
      <g fill="none" stroke="url(#cl-goldlight)" strokeWidth="7" strokeLinecap="round">
        <path d="M168,200 C190,170 226,160 256,166" />
        <path d="M300,164 C330,154 356,174 370,208" />
        <path d="M180,250 C210,226 246,220 264,234" />
        <path d="M272,232 C294,214 324,214 342,244" />
        <path d="M184,292 C212,276 246,284 266,300" />
        <path d="M272,302 C296,286 320,292 342,306" />
        <path d="M228,346 C240,368 246,388 242,408" opacity="0.85" />
        <path d="M286,346 C272,368 266,388 270,408" opacity="0.85" />
      </g>
      <g fill="none" stroke="url(#cl-goldlight)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M310,138 L352,138 L352,192" />
        <path d="M202,382 L160,382 L160,330" />
      </g>
      <circle cx="352" cy="212" r="13" fill="url(#cl-gold)" />
      <circle cx="160" cy="312" r="13" fill="url(#cl-gold)" />
      <g stroke="url(#cl-goldlight)" strokeWidth="7" strokeLinecap="round" opacity="0.95">
        <path d="M112,96 L144,96" />
        <path d="M128,80 L128,112" />
        <path d="M398,336 L430,336" />
        <path d="M414,320 L414,352" />
      </g>
      <circle cx="96" cy="340" r="8" fill="url(#cl-gold)" />
    </svg>
  );
}

export default ConnectedLogo;
