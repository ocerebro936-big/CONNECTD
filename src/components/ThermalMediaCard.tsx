import React from 'react';
import { calculateTemperature, getTemperatureStyles, getGridCols } from '../lib/thermal-utils';
import { ThermalBadge } from './ThermalBadge';

interface ThermalMediaCardProps {
  title: string;
  imageUrl: string;
  author: string;
  likes?: number;
  comments?: number;
  views?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ThermalMediaCard({
  title,
  imageUrl,
  author,
  likes = 0,
  comments = 0,
  views = 0,
  className = '',
  children,
}: ThermalMediaCardProps) {
  const temperature = calculateTemperature(likes, comments, views);
  const styles = getTemperatureStyles(temperature);
  const gridSize = getGridCols(temperature);

  return (
    <div
      className={`transition-all duration-500 rounded-2xl overflow-hidden bg-neutral-900/80 border-2 ${styles.border} ${styles.glow} ${gridSize} p-3 ${className}`}
      style={{ transform: `scale(${styles.scale})` }}
    >
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <ThermalBadge temperature={temperature} />
        </div>
      </div>

      <div className="mt-3 flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-bold text-sm line-clamp-1">{title}</h4>
          <p className="text-neutral-400 text-xs">Por @{author}</p>
        </div>
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
