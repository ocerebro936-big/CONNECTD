import React from 'react';
import { useInView } from '../lib/fast-engine/lazy';
import { useConnectionTier, targetWidthForTier, type ConnectionTier } from '../lib/fast-engine/connection';

export interface LazyMediaProps {
  src: string;
  type?: 'image' | 'video';
  poster?: string;
  alt?: string;
  className?: string;
  derivatives?: Record<string, string>;
}

function pickDerivative(
  derivatives: Record<string, string> | undefined,
  tier: ConnectionTier,
  original: string
): string {
  if (!derivatives) return original;
  if (tier === 'slow') return derivatives['thumbnail'] || derivatives['small'] || original;
  if (tier === 'medium') return derivatives['medium'] || derivatives['small'] || original;
  return derivatives['original'] || original;
}

export const LazyMedia: React.FC<LazyMediaProps> = ({
  src,
  type = 'image',
  poster,
  alt = '',
  className = '',
  derivatives,
}) => {
  const [ref, inView] = useInView<HTMLDivElement>();
  const tier = useConnectionTier();
  const chosen = type === 'image' ? pickDerivative(derivatives, tier, src) : src;

  return (
    <div ref={ref} className={className}>
      {inView && type === 'image' && (
        <img
          src={chosen}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      )}
      {inView && type === 'video' && (
        <video
          src={chosen}
          poster={poster}
          controls
          preload="none"
          playsInline
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
};

export default LazyMedia;
