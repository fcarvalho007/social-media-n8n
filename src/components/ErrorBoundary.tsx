import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { eErroDeChunk, tentarRecarga } from '@/lib/recargaBuild';

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
    // Stale build after deploy: one guarded reload; other errors keep the normal screen.
    if (eErroDeChunk(error)) tentarRecarga(localStorage, () => window.location.reload(), error);
  }

  public render() {
    if (this.state.hasError) {
      const versao = eErroDeChunk(this.state.error);
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{versao ? "Há uma nova versão da app" : "Algo correu mal"}</h2>
            <p className="text-muted-foreground mb-4">
              {versao
                ? "Não foi possível abrir esta página automaticamente. Recarrega para continuar; o texto que estavas a escrever nos editores e na fonte do carrossel fica guardado neste dispositivo."
                : "Recarrega a página. Se o problema persistir, contacta o suporte."}
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
              onClick={() => { window.location.href = window.location.pathname + '?cb=' + Date.now(); }}
              className="px-6"
            >
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
