import { useCallback, useEffect, useState } from 'react';

export const TOTAL_STEPS = 5 as const;
export type StepNumber = 1 | 2 | 3 | 4 | 5;

interface UseStepperParams {
  /** True when at least one format is selected (gates step 2). */
  canAdvanceToStep2: boolean;
  /** True when minimum media count is satisfied (gates step 3). */
  canAdvanceToStep3: boolean;
  /** True when caption has content (gates step 4). */
  canAdvanceToStep4?: boolean;
  /** True when network options touched OR explicitly skipped (gates step 5). */
  canAdvanceToStep5?: boolean;
}

/**
 * useStepper
 * ----------
 * Tracks current step (1-5), visited steps, and exposes navigation helpers.
 *
 * Mapeamento das 5 secções do progressive disclosure:
 *   1 — Networks            (`canAdvanceToStep2`)
 *   2 — Média               (`canAdvanceToStep3`)
 *   3 — Legenda             (`canAdvanceToStep4`)
 *   4 — Opções por rede     (`canAdvanceToStep5`) — opcional
 *   5 — Agendamento + Publish
 *
 * Os gates 4 e 5 são opcionais: se não forem fornecidos, o stepper trata-os
 * como `true` (sem gate), preservando comportamento legado quando
 * `Step3CaptionCard` ainda controla todo o passo 3.
 */
export function useStepper({
  canAdvanceToStep2,
  canAdvanceToStep3,
  canAdvanceToStep4 = true,
  canAdvanceToStep5 = true,
}: UseStepperParams) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);

  // Auto-advance to step 2 once formats are selected
  useEffect(() => {
    if (canAdvanceToStep2 && !visitedSteps.includes(2)) {
      setVisitedSteps((prev) => [...prev, 2]);
      if (currentStep === 1) setCurrentStep(2);
    }
  }, [canAdvanceToStep2, visitedSteps, currentStep]);

  // Auto-advance to step 3 once media is uploaded
  useEffect(() => {
    if (canAdvanceToStep3 && !visitedSteps.includes(3)) {
      setVisitedSteps((prev) => [...prev, 3]);
      if (currentStep === 2) setCurrentStep(3);
    }
  }, [canAdvanceToStep3, visitedSteps, currentStep]);

  // Auto-advance to step 4 once caption has content
  useEffect(() => {
    if (canAdvanceToStep4 && canAdvanceToStep3 && !visitedSteps.includes(4)) {
      setVisitedSteps((prev) => [...prev, 4]);
      // Não força mudança de currentStep — passo 4 é opcional.
    }
  }, [canAdvanceToStep4, canAdvanceToStep3, visitedSteps]);

  // Auto-advance to step 5 once network options touched (or skipped)
  useEffect(() => {
    if (canAdvanceToStep5 && canAdvanceToStep4 && !visitedSteps.includes(5)) {
      setVisitedSteps((prev) => [...prev, 5]);
    }
  }, [canAdvanceToStep5, canAdvanceToStep4, visitedSteps]);

  const goToStep = useCallback(
    (step: number) => {
      if (visitedSteps.includes(step)) {
        setCurrentStep(step as StepNumber);
      }
    },
    [visitedSteps],
  );

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      const nextStepNum = (currentStep + 1) as StepNumber;
      setVisitedSteps((prev) => (prev.includes(nextStepNum) ? prev : [...prev, nextStepNum]));
      setCurrentStep(nextStepNum);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as StepNumber);
  }, [currentStep]);

  return {
    currentStep,
    visitedSteps,
    setCurrentStep,
    setVisitedSteps,
    goToStep,
    nextStep,
    previousStep,
  };
}

export type Stepper = ReturnType<typeof useStepper>;
