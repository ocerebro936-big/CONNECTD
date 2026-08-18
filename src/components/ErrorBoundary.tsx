import { Component } from 'react';

// Nota: @types/react não está instalado no projeto, pelo que `Component` resolve
// como `any`. Usamos casts localizados para continuar a compilar; o comportamento
// de runtime (getDerivedStateFromError/componentDidCatch) funciona normalmente.
type BState = { error: Error | null };

export class ErrorBoundary extends (Component as any) {
  state: BState = { error: null };

  static getDerivedStateFromError(error: Error): BState {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('[ConnectedKing] Erro capturado:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto mt-20 p-6 glass-card rounded-2xl border border-rose-300 text-center space-y-3">
          <p className="text-2xl font-bold text-rose-600">Ocorreu um erro nesta secção 👑</p>
          <p className="text-sm text-slate-600 font-medium break-words">{this.state.error.message}</p>
          <button
            onClick={() => (this as any).setState({ error: null })}
            className="rounded-xl bg-primary text-black font-bold px-4 py-2"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

export default ErrorBoundary;
