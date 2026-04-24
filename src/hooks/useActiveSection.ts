import { useCallback, useState } from 'react';

/**
 * Hook que garante apenas uma secção `active` em simultâneo dentro do
 * fluxo de progressive disclosure de `/manual-create`.
 *
 * Não controla os estados `complete` / `error` das secções — esses são
 * derivados pelas próprias secções (validação local). Apenas dita qual é
 * a secção em foco.
 */
export type SectionId = string;

export function useActiveSection(initial: SectionId | null = null) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(initial);

  const activate = useCallback((id: SectionId) => {
    setActiveSection((current) => (current === id ? current : id));
  }, []);

  const deactivate = useCallback((id: SectionId) => {
    setActiveSection((current) => (current === id ? null : current));
  }, []);

  const isActive = useCallback((id: SectionId) => activeSection === id, [activeSection]);

  return {
    activeSection,
    setActiveSection,
    activate,
    deactivate,
    isActive,
  };
}
