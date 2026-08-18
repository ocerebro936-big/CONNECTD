// ============================================================================
// Connected King Cloud — CcsUploader (componente de upload)
// ----------------------------------------------------------------------------
// Botão de carregamento que envia ficheiros para a Connected Cloud Storage via
// uploadToCcs (ccsUserKey/ccsPostKey). Suporta avatar, fotos, vídeos, áudio e
// documentos, com barra de progresso e verificação de quota.
// ============================================================================
import React, { useRef, useState } from 'react';
import { uploadToCcs, CcsFolder, CcsUploadResult } from '../lib/ccs/upload';
import type { CcsVisibility } from '../lib/ccs';

interface CcsUploaderProps {
  userId: string;
  userName: string;
  folder: CcsFolder;
  kind: any;
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

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = '';
    if (!list || list.length === 0) return;
    const files: File[] = [];
    for (let i = 0; i < list.length; i++) files.push(list[i]);
    setBusy(true);
    setError(undefined);
    const results: CcsUploadResult[] = [];
    try {
      for (const f of files) {
        const r = await uploadToCcs({
          ownerUid: userId,
          ownerName: userName,
          file: f,
          folder,
          kind,
          visibility: (visibility ?? 'public') as CcsVisibility,
          user,
          profileData,
          onProgress: setProgress,
        });
        results.push(r);
      }
      onUploaded?.(results);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar para a Connected Cloud.');
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
    </span>
  );
};
