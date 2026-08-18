import React from 'react';

interface ConnectedLogoProps {
  className?: string;
  glow?: boolean;
  breathing?: boolean;
  spin3d?: boolean;
  enter?: boolean;
}

const LOGO_CSS = `
@keyframes cl-pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(233,184,84,0.30)); }
  50%      { filter: drop-shadow(0 0 22px rgba(233,184,84,0.65)); }
}
@keyframes cl-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.045); }
}
@keyframes cl-spin3d {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
@keyframes cl-enter {
  0%   { opacity: 0; transform: scale(0.7) translateY(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes cl-particle {
  0%, 100% { opacity: 0; }
  45%      { opacity: 1; }
  70%      { opacity: 0.25; }
}
@keyframes cl-scan {
  0%   { stroke: #7c5413; }
  50%  { stroke: #f9e9a8; }
  100% { stroke: #7c5413; }
}
.cl-root {
  display: inline-block;
  transform-style: preserve-3d;
}
.cl-root.cl-enter {
  animation: cl-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.cl-root.cl-breathe {
  animation: cl-breathe 3.2s ease-in-out infinite;
}
.cl-root.cl-spin3d {
  animation: cl-spin3d 14s linear infinite;
}
.cl-root.cl-spin3d:hover {
  animation-play-state: paused;
}
.cl-svg { animation: cl-pulse-glow 2.6s ease-in-out infinite; }
.cl-particle { animation: cl-particle 4s ease-in-out infinite; }
.cl-trace { animation: cl-scan 3.4s ease-in-out infinite; }
.cl-enter-badge { animation: cl-scan 2.4s ease-in-out infinite; }
`;

export function ConnectedLogo({
  className = 'h-10 w-10',
  glow = true,
  breathing = false,
  spin3d = false,
  enter = false,
}: ConnectedLogoProps) {
  const rootClass = [
    'cl-root',
    breathing ? 'cl-breathe' : '',
    spin3d ? 'cl-spin3d' : '',
    enter ? 'cl-enter' : '',
  ].filter(Boolean).join(' ');
  return (
    <span className={rootClass}>
      <style dangerouslySetInnerHTML={{ __html: LOGO_CSS }} />
      <svg
        viewBox="0 0 512 512"
        role="img"
        aria-label="Connected King"
        className={`${className} cl-svg`}
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
        <path d="M256,384 L256,352" stroke="#7c5413" strokeWidth="8" strokeLinecap="round" className="cl-trace" opacity="0.85" />
        <g fill="none" stroke="url(#cl-goldlight)" strokeWidth="7" strokeLinecap="round">
          <path d="M168,200 C190,170 226,160 256,166" className="cl-trace" style={{ animationDelay: '0.3s' }} />
          <path d="M300,164 C330,154 356,174 370,208" className="cl-trace" style={{ animationDelay: '0.7s' }} />
          <path d="M180,250 C210,226 246,220 264,234" className="cl-trace" style={{ animationDelay: '1.1s' }} />
          <path d="M272,232 C294,214 324,214 342,244" className="cl-trace" style={{ animationDelay: '1.5s' }} />
          <path d="M184,292 C212,276 246,284 266,300" className="cl-trace" style={{ animationDelay: '1.9s' }} />
          <path d="M272,302 C296,286 320,292 342,306" className="cl-trace" style={{ animationDelay: '2.3s' }} />
          <path d="M228,346 C240,368 246,388 242,408" className="cl-trace" style={{ animationDelay: '2.7s' }} />
          <path d="M286,346 C272,368 266,388 270,408" className="cl-trace" style={{ animationDelay: '3.1s' }} />
        </g>
        <g fill="none" stroke="url(#cl-goldlight)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <path d="M310,138 L352,138 L352,192" />
          <path d="M202,382 L160,382 L160,330" />
        </g>
        <circle cx="352" cy="212" r="13" fill="url(#cl-gold)">
          <animate attributeName="opacity" values="1;0.4;1" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="160" cy="312" r="13" fill="url(#cl-gold)">
          <animate attributeName="opacity" values="1;0.4;1" dur="3.6s" repeatCount="indefinite" />
        </circle>
        <g stroke="url(#cl-goldlight)" strokeWidth="7" strokeLinecap="round" opacity="0.95">
          <path d="M112,96 L144,96" />
          <path d="M128,80 L128,112" />
          <path d="M398,336 L430,336" />
          <path d="M414,320 L414,352" />
        </g>
        <circle cx="96" cy="340" r="8" fill="url(#cl-gold)" />
        <g className="cl-particles" stroke="none">
          <circle cx="80" cy="120" r="3.5" fill="#f3d77c" className="cl-particle" />
          <circle cx="432" cy="96" r="3" fill="#ecc35a" className="cl-particle" style={{ animationDelay: '1.2s' }} />
          <circle cx="448" cy="260" r="4" fill="#f9e9a8" className="cl-particle" style={{ animationDelay: '2.1s' }} />
          <circle cx="70" cy="220" r="2.5" fill="#e2b84e" className="cl-particle" style={{ animationDelay: '3s' }} />
          <circle cx="180" cy="90" r="2.5" fill="#f3d77c" className="cl-particle" style={{ animationDelay: '0.8s' }} />
          <circle cx="330" cy="440" r="3" fill="#ecc35a" className="cl-particle" style={{ animationDelay: '1.6s' }} />
          <circle cx="430" cy="420" r="2.5" fill="#fdf3c4" className="cl-particle" style={{ animationDelay: '2.6s' }} />
        </g>
      </svg>
    </span>
  );
}

export default ConnectedLogo;