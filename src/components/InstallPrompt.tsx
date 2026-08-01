import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'connected_install_dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const checkInstalled = useCallback(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    checkInstalled();
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
    });

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsVisible(true);
      }
    };

    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream &&
      (window.matchMedia('(display-mode: browser)').matches || !(window.navigator as any).standalone);
    if (isIosDevice) {
      setIsIos(true);
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsVisible(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, [checkInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in">
      <div className="glass-card rounded-2xl shadow-2xl border border-white/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">
                📲 Instalar Connected
              </p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                Instala em menos de 10 segundos · Funciona como App · Ícone no ecrã inicial
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-800 shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIos ? (
          <div className="mt-3 text-[11px] font-semibold text-slate-600 leading-relaxed">
            No iPhone/iPad: toca no botão{' '}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 rounded-md text-slate-800">
              Partilhar <span className="text-xs">⬆️</span>
            </span>{' '}
            e escolhe <b>“Adicionar ao Ecrã Início”</b>.
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-md hover:opacity-90 transition-all"
          >
            Instalar Agora
          </button>
        )}
      </div>
    </div>
  );
}
