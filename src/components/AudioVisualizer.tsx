import React from 'react';

interface AudioVisualizerProps {
  playing: boolean;
  bars?: number;
  className?: string;
}

export function AudioVisualizer({ playing, bars = 24, className = '' }: AudioVisualizerProps) {
  return (
    <div className={`flex items-end gap-[3px] h-8 ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`cn-eq-bar w-[3px] rounded-full ${playing ? 'bg-gradient-to-t from-emerald-500 to-teal-300' : 'bg-slate-300'}`}
          style={{
            height: `${35 + ((i * 37) % 60)}%`,
            animationDelay: `${(i % 7) * 0.11}s`,
            animationDuration: `${0.7 + ((i * 13) % 5) * 0.09}s`,
            animationPlayState: playing ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
}

export default AudioVisualizer;