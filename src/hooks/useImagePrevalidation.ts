/**
 * Hook para pré-validar imagens antes de exportação/publicação
 * Fase 3: Validação Preventiva
 * Optimizado para evitar re-validações desnecessárias
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { validateImageBatch, getValidationSummary, ImageValidationResult } from '@/lib/imageValidation';

interface UseImagePrevalidationProps {
  images: string[];
  enabled?: boolean;
}

interface UseImagePrevalidationReturn {
  validations: ImageValidationResult[];
  summary: ReturnType<typeof getValidationSummary>;
  summaryKey: string;
  isValidating: boolean;
  hasProblems: boolean;
}

// Cache de resultados por conjunto de imagens
const validationCache = new Map<string, ImageValidationResult[]>();

export function useImagePrevalidation({
  images,
  enabled = true,
}: UseImagePrevalidationProps): UseImagePrevalidationReturn {
  const [validations, setValidations] = useState<ImageValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Criar chave estável baseada nas URLs das imagens
  const imagesKey = useMemo(() => images.sort().join('|'), [images]);

  useEffect(() => {
    if (!enabled || images.length === 0) {
      setValidations([]);
      return;
    }

    // Verificar cache primeiro
    const cached = validationCache.get(imagesKey);
    if (cached) {
      setValidations(cached);
      return;
    }

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    let cancelled = false;

    // Debounce de 400ms para evitar validações redundantes
    debounceTimerRef.current = setTimeout(async () => {
      setIsValidating(true);
      try {
        const results = await validateImageBatch(images);
        if (!cancelled) {
          setValidations(results);
          // Guardar em cache
          validationCache.set(imagesKey, results);
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
    }, 400);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [imagesKey, enabled]);

  // Memoizar summary para evitar nova identidade a cada render
  const summary = useMemo(() => getValidationSummary(validations), [validations]);
  
  // Criar chave estável para o summary
  const summaryKey = useMemo(
    () => `${summary.corsIssues}-${summary.otherErrors}-${summary.total}`,
    [summary.corsIssues, summary.otherErrors, summary.total]
  );
  
  const hasProblems = summary.corsIssues > 0 || summary.otherErrors > 0;

  return {
    validations,
    summary,
    summaryKey,
    isValidating,
    hasProblems,
  };
}
