import React from 'react';

export const UploadProgress: React.FC<{ value: number | null; label?: string }> = ({
  value,
  label,
}) => {
  if (value === null) return null;
  return (
    <div className="w-full">
      {label && <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>}
      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-200"
          style={{ width: `${Math.max(0, Math.min(100, Math.round(value * 100)))}%` }}
        />
      </div>
    </div>
  );
};
