import { useCallback, useEffect, useRef } from 'react';

/**
 * Detecta períodos de inactividade do utilizador e dispara um callback
 * após `timeout` ms sem qualquer interacção dos eventos monitorizados.
 *
 * Usado no fluxo `/manual-create` para auto-save silencioso quando
 * o utilizador parece ter abandonado o ecrã com trabalho em curso.
 *
 * - Reset automático em `keydown`, `mousemove`, `click`, `scroll`,
 *   `touchstart` (capture phase, passive).
 * - `cooldown` evita disparos consecutivos.
 * - `enabled=false` desactiva tudo (sem listeners, sem timer).
 * - `signature` evita disparar quando nada mudou desde o último auto-save.
 *
 * Padrão UX: Notion/Linear/Figma — auto-save silencioso > toast intrusivo.
 * Defaults conservadores: 60s de inactividade + 5min entre disparos.
 */
export interface UseIdleDetectionOptions {
  /** Activar/desactivar a detecção. */
  enabled: boolean;
  /** Tempo em ms sem actividade antes de disparar `onIdle`. Default: 60_000 (60s). */
  timeout?: number;
  /** Tempo em ms entre disparos consecutivos. Default: 300_000 (5min). */
  cooldown?: number;
  /**
   * Assinatura do estado actual (ex.: hash do draft). Se for igual à
   * assinatura no último disparo, `onIdle` não é chamado — evita
   * auto-saves redundantes quando nada mudou.
   */
  signature?: string;
  /** Callback executado quando o utilizador fica idle. */
  onIdle: () => void;
}

const IDLE_EVENTS: Array<keyof DocumentEventMap> = [
  'keydown',
  'mousemove',
  'click',
  'scroll',
  'touchstart',
];

export function useIdleDetection({
  enabled,
  timeout = 60_000,
  cooldown = 300_000,
  signature,
  onIdle,
}: UseIdleDetectionOptions) {
  const timerRef = useRef<number | null>(null);
  const lastFiredRef = useRef<number>(0);
  const lastSignatureRef = useRef<string | undefined>(undefined);
  const onIdleRef = useRef(onIdle);
  const signatureRef = useRef(signature);

  // Mantém referências frescas sem re-criar listeners.
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    signatureRef.current = signature;
  }, [signature]);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastFiredRef.current < cooldown) return;
      // Evita disparar se a assinatura não mudou desde o último auto-save.
      if (
        signatureRef.current !== undefined &&
        signatureRef.current === lastSignatureRef.current
      ) {
        return;
      }
      lastFiredRef.current = now;
      lastSignatureRef.current = signatureRef.current;
      onIdleRef.current();
    }, timeout);
  }, [timeout, cooldown]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    resetTimer();
    const handler = () => resetTimer();
    for (const evt of IDLE_EVENTS) {
      window.addEventListener(evt, handler, { passive: true, capture: true });
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const evt of IDLE_EVENTS) {
        window.removeEventListener(evt, handler, { capture: true } as EventListenerOptions);
      }
    };
  }, [enabled, resetTimer]);
}
