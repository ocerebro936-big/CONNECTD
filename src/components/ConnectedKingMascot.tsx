import React from "react";

interface Props {
  size?: number;
  className?: string;
  /** mostra partículas e brilho extra (splash/loading) */
  showParticles?: boolean;
}

// ============================================================================
// Connected King Mascot — boneco coroado animado (SVG + CSS).
// ----------------------------------------------------------------------------
// Coroa dourada com brilho, boneco a acenar, partículas douradas e fundo
// transparente. Sem imagens externas (o gerador de imagens está indisponível
// nesta sessão), logo a mascote é vetorial e reutilizável em login, loading,
// DIVINO, feed e splash. Paleta oficial de ouro.
// ============================================================================
export function ConnectedKingMascot({ size = 160, className = "", showParticles = true }: Props) {
  const particles = [
    { x: 36, y: 40, px: "-10px", py: "-26px", d: "0s" },
    { x: 164, y: 52, px: "12px", py: "-22px", d: "0.6s" },
    { x: 28, y: 120, px: "-14px", py: "-18px", d: "1.1s" },
    { x: 172, y: 132, px: "14px", py: "-20px", d: "1.6s" },
    { x: 100, y: 18, px: "0px", py: "-30px", d: "0.9s" },
    { x: 140, y: 170, px: "8px", py: "-16px", d: "2.1s" },
  ];

  return (
    <span
      className={`ck-mascot ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Connected King — mascote"
    >
      <svg viewBox="0 0 200 220" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ckGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a7219" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#f5d76e" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
          <linearGradient id="ckGoldSoft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <radialGradient id="ckGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ckShimmerClip">
            <path d="M70 70 L130 70 L130 96 L70 96 Z" />
          </clipPath>
        </defs>

        {/* aura dourada suave */}
        <ellipse cx="100" cy="96" rx="78" ry="86" fill="url(#ckGlow)" />

        <g className="ck-mascot__float">
          {/* corpo / manto real */}
          <path
            d="M62 210 C62 150 70 132 100 132 C130 132 138 150 138 210 Z"
            fill="#1b1b22"
            stroke="url(#ckGoldSoft)"
            strokeWidth="3"
          />
          {/* detalhe de ouro no manto */}
          <path d="M100 140 L100 206" stroke="#d4af37" strokeWidth="2.5" opacity="0.8" />

          {/* cabeça */}
          <circle cx="100" cy="96" r="40" fill="#f3c9a3" />
          {/* rosto amigável */}
          <circle cx="86" cy="92" r="4.5" fill="#241a10" />
          <circle cx="114" cy="92" r="4.5" fill="#241a10" />
          <path d="M86 110 Q100 122 114 110" stroke="#241a10" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* bochechas suaves */}
          <circle cx="80" cy="104" r="5" fill="#f6a98a" opacity="0.6" />
          <circle cx="120" cy="104" r="5" fill="#f6a98a" opacity="0.6" />

          {/* braço a acenar */}
          <g className="ck-mascot__wave">
            <path d="M132 150 Q156 138 150 112" stroke="#f3c9a3" strokeWidth="11" fill="none" strokeLinecap="round" />
            <circle cx="150" cy="108" r="9" fill="#f3c9a3" stroke="#d4af37" strokeWidth="2" />
          </g>

          {/* coroa dourada com brilho */}
          <g className="ck-mascot__crown">
            <path
              d="M70 64 L78 40 L92 58 L100 34 L108 58 L122 40 L130 64 Z"
              fill="url(#ckGold)"
              stroke="#9a7219"
              strokeWidth="2"
            />
            <circle cx="78" cy="40" r="4" fill="#ffd700" />
            <circle cx="100" cy="34" r="5" fill="#fff3c4" />
            <circle cx="122" cy="40" r="4" fill="#ffd700" />
            <rect x="72" y="62" width="56" height="7" rx="3" fill="#d4af37" />
            {/* reflexo de luz a passar */}
            <g clipPath="url(#ckShimmerClip)">
              <rect className="ck-mascot__shimmer" x="60" y="60" width="14" height="40" fill="#fff7d6" opacity="0.7" />
            </g>
          </g>
        </g>

        {/* partículas douradas */}
        {showParticles &&
          particles.map((p, i) => (
            <circle
              key={i}
              className="ck-mascot__particle"
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#ffd700"
              style={
                {
                  ["--px" as any]: p.px,
                  ["--py" as any]: p.py,
                  animationDelay: p.d,
                } as React.CSSProperties
              }
            />
          ))}
      </svg>
    </span>
  );
}
