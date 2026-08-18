import React, { useRef, useState } from 'react';
import { ccsUpload } from '../../../lib/ccs/upload/uploader';
import type {
  CcsUploadResult,
  CcsFolder,
  CcsUploadKind,
  CcsVisibility,
} from '../../../lib/ccs/upload/types';
import { UploadProgress } from './Progress';
import { UploadQueue, type QueueItem } from './UploadQueue';

export interface CcsUploaderProps {
  userId: string;
  userName?: string;
  folder: CcsFolder;
  kind: CcsUploadKind;
  accept?: string;
  label?: string;
  icon?: React.ReactNode;
  multiple?: boolean;
  visibility?: CcsVisibility;
  className?: string;
  user?: any;
  profileData?: any;
  onUploaded?: (results: CcsUploadResult[]) => void;
}

export const CcsUploader: React.FC<CcsUploaderProps> = ({
  userId,
  userName,
  folder,
  kind,
  accept = 'image/*',
  label = 'Carregar',
  icon,
  multiple = false,
  visibility = 'public',
  className = '',
  user,
  profileData,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [queue, setQueue] = useState<QueueItem[]>([]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = '';
    if (!list || list.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < list.length; i++) files.push(list[i]);

    setBusy(true);
    setError(undefined);
    const results: CcsUploadResult[] = [];
    const items: QueueItem[] = files.map((f, i) => ({
      id: `${Date.now()}_${i}`,
      name: f.name,
      progress: 0,
      status: 'pending',
      file: f,
    }));
    setQueue(items);

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const itemId = items[i].id;
        setQueue((q) => q.map((it) => (it.id === itemId ? { ...it, status: 'uploading' } : it)));
        const r = await ccsUpload({
          ownerUid: userId,
          ownerName: userName,
          file: f,
          folder,
          kind,
          visibility: visibility as CcsVisibility,
          user,
          profileData,
          onProgress: (frac) => {
            setProgress(frac);
            setQueue((q) => q.map((it) => (it.id === itemId ? { ...it, progress: frac } : it)));
          },
        });
        results.push(r);
        setQueue((q) => q.map((it) => (it.id === itemId ? { ...it, status: 'done', progress: 1 } : it)));
      }
      onUploaded?.(results);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao enviar para a Connected Cloud.';
      setError(msg);
      setQueue((q) =>
        q.map((it) => (it.status === 'uploading' ? { ...it, status: 'error', error: msg } : it))
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const labelText = busy
    ? progress !== null
      ? `A enviar ${Math.round(progress * 100)}%`
      : 'A enviar para a Connected Cloud…'
    : label;

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl px-3 h-9 text-sm font-semibold text-slate-700 bg-white/70 hover:bg-white border border-white/60 shadow-sm disabled:opacity-60 transition-colors"
      >
        {icon}
        {labelText}
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={onChange} />
      {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
      <UploadQueue items={queue} />
    </span>
  );
};

export default CcsUploader;
