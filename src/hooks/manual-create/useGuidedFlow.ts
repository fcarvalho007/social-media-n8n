import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'manual-create:guided-flow';

/**
 * Coordena a transição cinematográfica entre secções no fluxo
 * `/manual-create`:
 *
 *   colapsar secção actual → 400ms pausa → scroll suave → expandir próxima.
 *
 * - Persiste a preferência do utilizador em `localStorage` (toggle "Modo
 *   guiado"). Por omissão está activo.
 * - Respeita `prefers-reduced-motion`: substitui scroll suave por instantâneo
 *   e elimina a pausa intermédia.
 * - O caller é responsável por chamar `transitionTo(nextId, activate)` quando
 *   uma secção fica completa e quer entregar o foco à seguinte.
 */
export function useGuidedFlow() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === '1';
  });

  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = media.matches;
    const handler = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const setEnabledPersisted = useCallback((next: boolean) => {
    setEnabled(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  }, []);

  const toggle = useCallback(() => setEnabledPersisted(!enabled), [enabled, setEnabledPersisted]);

  /**
   * Transição cinematográfica para `nextSectionId`.
   *
   * @param nextSectionId  Id do `<SectionCard>` (mesmo `id` passado ao componente).
   * @param activate       Callback que mete a próxima secção em `active`.
   */
  const transitionTo = useCallback(
    (nextSectionId: string, activate: () => void) => {
      if (!enabled) {
        activate();
        // Mesmo com modo guiado off, faz scroll suave para a próxima
        // secção para manter a continuidade visual.
        const target = document.getElementById(nextSectionId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      const reduced = reducedMotionRef.current;
      // 320ms permite a animação de colapso da secção anterior (280ms)
      // terminar antes de começarmos a nova transição.
      const pause = reduced ? 0 : 320;

      window.setTimeout(() => {
        // Ordem crítica:
        // 1) Activar PRIMEIRO — garante que `activeSection` muda já no
        //    próximo tick e o `mediaState` calcula 'active' antes do
        //    scroll/render.
        activate();
        // 2) Scroll a seguir, num requestAnimationFrame para apanhar o
        //    layout pós-render do estado expandido.
        window.requestAnimationFrame(() => {
          const target = document.getElementById(nextSectionId);
          if (target) {
            target.scrollIntoView({
              behavior: reduced ? 'auto' : 'smooth',
              block: 'start',
            });
          }
        });
      }, pause);
    },
    [enabled],
  );

  return { enabled, setEnabled: setEnabledPersisted, toggle, transitionTo };
}
