import React from 'react';
import { getLevel, getLevelProgress } from '../lib/reputation-utils';

interface UserLevelBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export function UserLevelBadge({ points, size = 'sm', showProgress = false, className = '' }: UserLevelBadgeProps) {
  const { current, next, progress } = getLevelProgress(points);
  const sizeClasses = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className={`inline-flex items-center gap-1.5 ${sizeClasses} ${className}`}>
      <span className={`font-black ${current.color}`}>
        Lv.{current.level}
      </span>
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${current.badge}`}>
        {current.title}
      </span>
      {showProgress && next && (
        <div className="ml-1 flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{next.minPoints - points}pts</span>
        </div>
      )}
    </div>
  );
}
