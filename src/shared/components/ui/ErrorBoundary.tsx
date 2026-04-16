import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Trash2 } from 'lucide-react';
import { loggerService } from '@/kernel/services/LoggerService';

interface Props {
  children: ReactNode;
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
    loggerService.createLogger('ErrorBoundary').error("Uncaught error:", { error: error.toString(), errorInfo });
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">哎呀，页面崩溃了</h1>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">
            这通常是临时的。您可以尝试刷新页面，或者如果问题持续存在，尝试清除本地缓存。
          </p>

          <div className="rounded-lg bg-muted/30 p-4 mb-6 max-w-lg w-full overflow-auto text-left">
            <p className="text-xs font-mono text-red-500 break-all">{this.state.error?.toString()}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              刷新页面
            </button>
            <button
              onClick={this.handleClearCache}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              清除缓存并重置
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
