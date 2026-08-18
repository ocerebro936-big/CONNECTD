import React, { useEffect, useState } from 'react';

export const MediaPreview: React.FC<{ file: File }> = ({ file }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!url) return <div className="h-14 w-14 rounded-lg bg-slate-200 animate-pulse" />;

  if (file.type.startsWith('image/')) {
    return <img src={url} alt={file.name} className="h-14 w-14 rounded-lg object-cover border border-white shadow-sm" />;
  }
  if (file.type.startsWith('video/')) {
    return (
      <video src={url} className="h-14 w-14 rounded-lg object-cover border border-white shadow-sm" muted playsInline />
    );
  }
  if (file.type.startsWith('audio/')) {
    return <span className="h-14 w-14 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-sm">🎵</span>;
  }
  return <span className="h-14 w-14 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center text-2xl shadow-sm">📄</span>;
};
