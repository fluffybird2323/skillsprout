import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    // Attempt to clear local storage if state is corrupted, but keep the key
    localStorage.removeItem('manabu-storage');
    window.location.reload();
  };

  public render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-background flex flex-col items-center justify-center p-6 text-center text-slate-200 font-sans">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-brand-danger/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative bg-brand-background border-2 border-brand-danger p-6 rounded-3xl shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <AlertTriangle className="w-16 h-16 text-brand-danger" />
            </div>
          </div>

          <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">{t('error.systemFailure')}</h1>
          <p className="text-slate-400 font-mono mb-8 max-w-md">
            {t('error.criticalError')}
          </p>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10 max-w-lg w-full mb-8 overflow-auto max-h-40">
            <code className="text-xs text-brand-danger font-mono text-left block">
              {this.state.error?.toString()}
            </code>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
            <Button 
              onClick={this.handleReload} 
              variant="primary" 
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> {t('error.rebootSystem')}
            </Button>
            
            <Button 
              onClick={this.handleReset} 
              variant="danger" 
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> {t('error.hardReset')}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);