/**
 * Hook para pré-validar imagens antes de exportação/publicação
 * Fase 3: Validação Preventiva
 */

import { useState, useEffect } from 'react';
import { validateImageBatch, getValidationSummary, ImageValidationResult } from '@/lib/imageValidation';

interface UseImagePrevalidationProps {
  images: string[];
  enabled?: boolean;
}

interface UseImagePrevalidationReturn {
  validations: ImageValidationResult[];
  summary: ReturnType<typeof getValidationSummary>;
  isValidating: boolean;
  hasProblems: boolean;
}

export function useImagePrevalidation({
  images,
  enabled = true,
}: UseImagePrevalidationProps): UseImagePrevalidationReturn {
  const [validations, setValidations] = useState<ImageValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!enabled || images.length === 0) {
      setValidations([]);
      return;
    }

    let cancelled = false;

    const validateImages = async () => {
      setIsValidating(true);
      try {
        const results = await validateImageBatch(images);
        if (!cancelled) {
          setValidations(results);
        }
      } catch (error) {
        console.error('[Image Prevalidation] Error:', error);
        if (!cancelled) {
          setValidations([]);
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    validateImages();

    return () => {
      cancelled = true;
    };
  }, [images, enabled]);

  const summary = getValidationSummary(validations);
  const hasProblems = summary.corsIssues > 0 || summary.otherErrors > 0;

  return {
    validations,
    summary,
    isValidating,
    hasProblems,
  };
}
