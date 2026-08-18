import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../lib/app-version';

// ============================================================================
// Connected App — Atualização automática controlada
// ----------------------------------------------------------------------------
// O Service Worker descarrega a nova versão em segundo plano (Workbox). Quando
// estiver validada e pronta, mostramos o aviso e o utilizador decide ativar.
// Fluxo: Connected v1.0 → download em background → validação → ativação → v1.1
// ============================================================================

export function UpdateNotifier() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() {
      console.log('Connected pronta para funcionar offline.');
    },
  });

  const handleActivate = async () => {
    await updateServiceWorker(true);
    // O SW assume o controlo; recarregamos para aplicar os novos assets.
    setTimeout(() => window.location.reload(), 600);
  };

  if (!needRefresh) return null;

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
              Connected v{APP_VERSION} · atualização em segundo plano concluída
            </span>
          </p>
        </div>
        <button
          onClick={handleActivate}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-md hover:opacity-90 transition-all shrink-0"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
