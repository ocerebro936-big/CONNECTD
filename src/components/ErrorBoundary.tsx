import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white p-4">
          <div className="glass-card p-8 rounded-2xl max-w-lg w-full text-center border border-white/20 bg-white/10 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-rose-500 mb-4">Oops, algo deu errado!</h2>
            <p className="text-slate-300 mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <pre className="text-left bg-black/50 p-4 rounded-lg overflow-auto text-xs text-slate-400 mb-6 max-h-48">
              {this.state.error?.message}
            </pre>
            <button
              className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors"
              onClick={() => {
                // @ts-ignore
                this.setState({ hasError: false, error: null });
              }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}
