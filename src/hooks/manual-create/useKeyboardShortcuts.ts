import { useEffect } from 'react';

/**
 * Atalhos de teclado para o fluxo `/manual-create`:
 *
 *  - **Cmd/Ctrl + Enter** → publica (funciona mesmo dentro de inputs;
 *    é um atalho explícito que o utilizador conhece via tooltip).
 *  - **Cmd/Ctrl + S**     → guarda rascunho (suprime o save-page do
 *    browser via `preventDefault`). Não dispara se foco estiver num
 *    `<textarea>` (evita conflito com edição activa).
 *  - **Esc**              → callback opcional para fechar overlays
 *    customizados; modais Radix já tratam de Esc internamente.
 *  - **?** (sem modificadores) → abre modal de descoberta de atalhos.
 *    Padrão GitHub/Linear/Slack. Não dispara em inputs.
 *  - **Cmd/Ctrl + /**     → abre painel de "Ajustar tom" da legenda
 *    (callback opcional). Útil para utilizadores que escrevem muito.
 *
 * Todos os atalhos são desactivados quando `enabled=false`.
 */
export interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  onPublish?: () => void;
  onSaveDraft?: () => void;
  onEscape?: () => void;
  onShowShortcuts?: () => void;
  onAdjustTone?: () => void;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
};

export function useKeyboardShortcuts({
  enabled,
  onPublish,
  onSaveDraft,
  onEscape,
  onShowShortcuts,
  onAdjustTone,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handler = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl + Enter → publicar (sempre, mesmo em inputs).
      if (meta && event.key === 'Enter') {
        if (onPublish) {
          event.preventDefault();
          onPublish();
        }
        return;
      }

      // Cmd/Ctrl + S → guardar rascunho.
      if (meta && (event.key === 's' || event.key === 'S')) {
        if (onSaveDraft) {
          event.preventDefault();
          onSaveDraft();
        }
        return;
      }

      // Cmd/Ctrl + / → ajustar tom da legenda.
      if (meta && event.key === '/') {
        if (onAdjustTone) {
          event.preventDefault();
          onAdjustTone();
        }
        return;
      }

      // ? (sem modificadores) → abrir modal de atalhos. Não disparar
      // em inputs (caso contrário não se consegue escrever "?").
      // Aceita "?" directamente ou Shift+/ em layouts US.
      if (
        !meta &&
        !event.altKey &&
        event.key === '?' &&
        !isEditableTarget(event.target)
      ) {
        if (onShowShortcuts) {
          event.preventDefault();
          onShowShortcuts();
        }
        return;
      }

      // Esc → callback opcional. Não interferir se foco está em input.
      if (event.key === 'Escape' && !isEditableTarget(event.target)) {
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onPublish, onSaveDraft, onEscape, onShowShortcuts, onAdjustTone]);
}
