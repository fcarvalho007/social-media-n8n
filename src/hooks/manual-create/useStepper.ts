import { useCallback, useEffect, useState } from 'react';

interface UseStepperParams {
  /** True when at least one format is selected (gates step 2). */
  canAdvanceToStep2: boolean;
  /** True when minimum media count is satisfied (gates step 3). */
  canAdvanceToStep3: boolean;
}

/**
 * useStepper
 * ----------
 * Tracks current step (1-3), visited steps, and exposes navigation helpers.
 * Auto-advances when prerequisites are met, mirroring the original
 * ManualCreate.tsx behaviour.
 */
export function useStepper({ canAdvanceToStep2, canAdvanceToStep3 }: UseStepperParams) {
  const [currentStep, setCurrentStep] = useState(1);
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

  const goToStep = useCallback(
    (step: number) => {
      if (visitedSteps.includes(step)) {
        setCurrentStep(step);
      }
    },
    [visitedSteps],
  );

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      const nextStepNum = currentStep + 1;
      setVisitedSteps((prev) => (prev.includes(nextStepNum) ? prev : [...prev, nextStepNum]));
      setCurrentStep(nextStepNum);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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
