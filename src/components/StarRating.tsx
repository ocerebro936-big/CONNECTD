import React, { useState } from 'react';

interface StarRatingProps {
  postId: string;
  currentUserRating?: number;
  averageRating: number;
  totalRatings: number;
  onRate: (postId: string, score: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({
  postId,
  currentUserRating = 0,
  averageRating,
  totalRatings,
  onRate,
  size = 'sm',
}) => {
  const [hovered, setHovered] = useState(0);
  const [isRating, setIsRating] = useState(false);

  const starSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const displayScore = hovered || currentUserRating || averageRating;
  const fullStars = Math.floor(displayScore);
  const fraction = displayScore - fullStars;

  const handleRate = async (score: number) => {
    setIsRating(true);
    try {
      await onRate(postId, score);
    } finally {
      setIsRating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isFilled = star <= fullStars;
          const isPartial = star === fullStars + 1 && fraction > 0;

          return (
            <button
              key={star}
              disabled={isRating}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleRate(star)}
              className={`${starSize} transition-transform hover:scale-125 disabled:opacity-50 disabled:cursor-wait focus:outline-none ${
                star <= (hovered || currentUserRating) ? 'drop-shadow-[0_0_3px_rgba(250,204,21,0.6)]' : ''
              }`}
              aria-label={`Avaliar ${star} de 10`}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <defs>
                  {isPartial && (
                    <linearGradient id={`partial-${postId}-${star}`}>
                      <stop offset={`${fraction * 100}%`} stopColor="#facc15" />
                      <stop offset={`${fraction * 100}%`} stopColor="#e2e8f0" />
                    </linearGradient>
                  )}
                </defs>
                <path
                  fill={
                    isFilled
                      ? '#facc15'
                      : isPartial
                      ? `url(#partial-${postId}-${star})`
                      : star <= hovered
                      ? '#facc15'
                      : star <= currentUserRating
                      ? '#facc15'
                      : '#e2e8f0'
                  }
                  stroke={star <= (hovered || currentUserRating) ? '#facc15' : '#cbd5e1'}
                  strokeWidth="1.5"
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        {averageRating > 0 ? (
          <>
            <span className="font-bold text-slate-900 text-xs">{averageRating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 font-medium">· {totalRatings} {totalRatings === 1 ? 'avaliação' : 'avaliações'}</span>
          </>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Ainda sem avaliações</span>
        )}
        {currentUserRating > 0 && (
          <span className="text-[10px] text-amber-500 font-bold ml-1">(tua: {currentUserRating})</span>
        )}
      </div>
    </div>
  );
};

export default StarRating;
