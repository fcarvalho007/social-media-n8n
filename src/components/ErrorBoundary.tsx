import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Algo correu mal</h2>
            <p className="text-muted-foreground mb-4">
              Por favor, recarregue a página ou contacte o suporte se o problema persistir.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left bg-muted p-3 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium mb-2">Detalhes técnicos</summary>
                <code className="text-destructive break-all">
                  {this.state.error.message}
                </code>
              </details>
            )}
            <Button
              onClick={() => window.location.reload()}
              className="px-6"
            >
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
