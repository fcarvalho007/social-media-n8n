import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { eErroDeChunk, tentarRecarga } from '@/lib/recargaBuild';

interface Props {
  children: ReactNode;
  inline?: boolean;
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
        <div role="alert" className={`flex items-center justify-center bg-background p-6 ${this.props.inline ? 'min-h-80' : 'min-h-screen'}`}>
          <div className="max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{versao ? "Há uma nova versão da app" : "Não foi possível abrir esta página"}</h1>
            <p className="text-muted-foreground mb-4">
              {versao
                ? "Não foi possível abrir esta página automaticamente. Recarrega para continuar; o texto que estavas a escrever nos editores e na fonte do carrossel fica guardado neste dispositivo."
                : "Tenta carregar a página de novo. Se o problema continuar, podes abrir outra área pelo menu."}
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
              onClick={() => { window.location.href = urlRecarga(window.location.href); }}
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

/** Preserve editor IDs, filters and fragments while bypassing a stale app shell. */
export function urlRecarga(href: string): string {
  const url = new URL(href);
  url.searchParams.set('cb', String(Date.now()));
  return url.href;
}
