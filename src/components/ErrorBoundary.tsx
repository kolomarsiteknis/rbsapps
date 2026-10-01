import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Database } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Application ErrorBoundary Caught Error]:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleHardReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDbError =
        this.state.error?.message?.toLowerCase().includes('firestore') ||
        this.state.error?.message?.toLowerCase().includes('firebase') ||
        this.state.error?.message?.toLowerCase().includes('offline') ||
        this.state.error?.message?.toLowerCase().includes('network') ||
        this.state.error?.message?.toLowerCase().includes('permission');

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-slate-800/80 pb-5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0">
                {isDbError ? <Database className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  {isDbError ? 'Konektivitas Database' : 'Pemberitahuan Sistem'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {this.props.fallbackTitle || (isDbError ? 'Gangguan Komunikasi Data' : 'Terjadi Kendala pada Tampilan')}
                </h1>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <p>
                {this.props.fallbackMessage ||
                  (isDbError
                    ? 'Aplikasi mendeteksi kendala pada koneksi database atau jaringan. Sistem telah mengisolasi error ini agar tidak menghentikan keseluruhan sistem.'
                    : 'Aplikasi mengalami kendala tak terduga saat memproses tampilan modul. Silakan coba muat ulang komponen atau segarkan browser.')}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold text-rose-400">Pesan Error:</span>
                  <span className="text-[10px] text-slate-500">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="text-rose-300 break-words font-semibold text-[11px]">
                  {this.state.error.message || 'Unknown runtime error'}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Coba Pulihkan Tampilan</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
