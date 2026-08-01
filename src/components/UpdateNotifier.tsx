import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          onUpdate();
          return;
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdate();
            }
          });
        });
      });
    }

    let lastSw = '';
    const interval = setInterval(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          const key = reg?.active?.state || '';
          if (reg?.waiting) onUpdate();
          if (lastSw && reg?.active?.state === 'activated') {
            lastSw = '';
          }
          lastSw = key;
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleReload = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-top-4 fade-in">
      <div className="glass-card rounded-2xl shadow-2xl border border-indigo-300/40 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600">
            <RefreshCw className="h-4.5 w-4.5" />
          </div>
          <p className="text-xs font-bold text-slate-900">
            Nova versão disponível
            <span className="block text-[10px] font-semibold text-slate-600">
              Atualização em segundo plano concluída
            </span>
          </p>
        </div>
        <button
          onClick={handleReload}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-md hover:opacity-90 transition-all shrink-0"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
