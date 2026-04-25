import { useCallback, useEffect, useRef } from 'react';

/**
 * Detecta períodos de inactividade do utilizador e dispara um callback
 * após `timeout` ms sem qualquer interacção dos eventos monitorizados.
 *
 * Usado no fluxo `/manual-create` para sugerir guardar rascunho quando
 * o utilizador parece ter abandonado o ecrã com trabalho em curso.
 *
 * - Reset automático em `keydown`, `mousemove`, `click`, `scroll`,
 *   `touchstart` (capture phase, passive).
 * - `cooldown` evita disparos consecutivos.
 * - `enabled=false` desactiva tudo (sem listeners, sem timer).
 */
export interface UseIdleDetectionOptions {
  /** Activar/desactivar a detecção. */
  enabled: boolean;
  /** Tempo em ms sem actividade antes de disparar `onIdle`. Default: 10_000. */
  timeout?: number;
  /** Tempo em ms entre disparos consecutivos. Default: 60_000. */
  cooldown?: number;
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
  timeout = 10_000,
  cooldown = 60_000,
  onIdle,
}: UseIdleDetectionOptions) {
  const timerRef = useRef<number | null>(null);
  const lastFiredRef = useRef<number>(0);
  const onIdleRef = useRef(onIdle);

  // Mantém referência fresca sem re-criar listeners.
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastFiredRef.current >= cooldown) {
        lastFiredRef.current = now;
        onIdleRef.current();
      }
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
