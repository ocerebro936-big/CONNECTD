import React from 'react';
import { MediaPreview } from './Preview';
import { UploadProgress } from './Progress';

export interface QueueItem {
  id: string;
  name: string;
  progress: number | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  file: File;
}

export const UploadQueue: React.FC<{ items: QueueItem[] }> = ({ items }) => {
  if (!items.length) return null;
  return (
    <ul className="w-full space-y-2 mt-1">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/60 p-2 shadow-sm"
        >
          <MediaPreview file={it.file} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">{it.name}</div>
            {it.status === 'error' ? (
              <div className="text-[11px] text-rose-600 font-medium truncate">{it.error}</div>
            ) : (
              <UploadProgress value={it.status === 'done' ? 1 : it.progress} />
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            {it.status === 'done' ? '✓' : it.status === 'error' ? '✕' : it.status === 'uploading' ? '…' : '⏳'}
          </span>
        </li>
      ))}
    </ul>
  );
};
