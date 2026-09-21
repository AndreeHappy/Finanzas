import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-lg mx-auto my-8 p-6 rounded-3xl glass-panel border border-rose-500/30 shadow-2xl text-center flex flex-col items-center gap-4 select-none">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
            <WarningCircle size={32} weight="bold" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {this.props.fallbackTitle || 'Ocurrió un problema visual'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                'Un componente visual tuvo una dificultad inesperada. Puedes recargar o reintentar sin perder tu sesión.'}
            </p>
          </div>
          {this.state.error && (
            <div className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 text-[11px] font-mono text-slate-600 dark:text-slate-400 text-left overflow-x-auto max-h-24">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <ArrowsClockwise size={15} weight="bold" />
              <span>Reintentar</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
