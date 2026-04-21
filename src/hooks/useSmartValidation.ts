import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PostFormat, SocialNetwork, getNetworkFromFormat } from '@/types/social';
import {
  ValidationFixHelpers,
  ValidationIssue,
  ValidationSummary,
  ValidatorContext,
} from '@/lib/validation/types';
import {
  buildValidationCacheKey,
  runAllValidators,
} from '@/lib/validation/runValidators';

interface UseSmartValidationParams {
  selectedFormats: PostFormat[];
  caption: string;
  mediaFiles: File[];
  hashtags: string[];
  scheduledDate: Date | null;
  scheduleAsap: boolean;
  userId?: string | null;
  enabled?: boolean;
  fixHelpers?: ValidationFixHelpers;
  /** Debounce window for caption/media changes (ms). Default 300. */
  debounceMs?: number;
}

const CACHE_LIMIT = 12;

/**
 * Smart pre-validation orchestrator. Runs the full validator suite with
 * debouncing, AbortController cancellation and an LRU cache so repeated
 * inputs are served from memory.
 */
export function useSmartValidation(
  params: UseSmartValidationParams,
): ValidationSummary {
  const {
    selectedFormats,
    caption,
    mediaFiles,
    hashtags,
    scheduledDate,
    scheduleAsap,
    userId,
    enabled = true,
    fixHelpers,
    debounceMs = 300,
  } = params;

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const cacheRef = useRef<Map<string, ValidationIssue[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fixHelpersRef = useRef(fixHelpers);
  fixHelpersRef.current = fixHelpers;

  const ctxBase = useMemo<Omit<ValidatorContext, 'signal' | 'fixHelpers'>>(
    () => ({
      selectedFormats,
      caption,
      mediaFiles,
      hashtags,
      scheduledDate,
      scheduleAsap,
      userId,
    }),
    [selectedFormats, caption, mediaFiles, hashtags, scheduledDate, scheduleAsap, userId],
  );

  const cacheKey = useMemo(
    () =>
      buildValidationCacheKey({
        ...ctxBase,
      } as ValidatorContext),
    [ctxBase],
  );

  const runValidation = useCallback(async () => {
    if (!enabled) {
      setIssues([]);
      setIsValidating(false);
      return;
    }

    // Cache hit
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      // Refresh insertion order for LRU behaviour
      cacheRef.current.delete(cacheKey);
      cacheRef.current.set(cacheKey, cached);
      setIssues(cached);
      setIsValidating(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsValidating(true);

    try {
      const ctx: ValidatorContext = {
        ...ctxBase,
        signal: controller.signal,
        fixHelpers: fixHelpersRef.current,
      };
      const result = await runAllValidators(ctx);
      if (controller.signal.aborted) return;

      cacheRef.current.set(cacheKey, result);
      // LRU eviction
      if (cacheRef.current.size > CACHE_LIMIT) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey !== undefined) cacheRef.current.delete(firstKey);
      }

      setIssues(result);
    } finally {
      if (!controller.signal.aborted) setIsValidating(false);
    }
  }, [cacheKey, ctxBase, enabled]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(runValidation, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [runValidation, debounceMs]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Public API ------------------------------------------------------------
  const visibleIssues = useMemo(
    () => issues.filter(i => !(i.dismissable && dismissed.has(i.id))),
    [issues, dismissed],
  );

  const errorCount = visibleIssues.filter(i => i.severity === 'error').length;
  const warningCount = visibleIssues.filter(i => i.severity === 'warning').length;
  const infoCount = visibleIssues.filter(i => i.severity === 'info').length;

  const byPlatform: Partial<Record<SocialNetwork, ValidationIssue[]>> = {};
  const byCategory: ValidationSummary['byCategory'] = {};
  visibleIssues.forEach(issue => {
    if (issue.platform) {
      (byPlatform[issue.platform] ??= []).push(issue);
    }
    (byCategory[issue.category] ??= []).push(issue);
  });

  const fix = useCallback(
    async (id: string) => {
      const issue = issues.find(i => i.id === id);
      if (!issue?.fixAction) return;
      try {
        await issue.fixAction();
        // Invalidate cache so the next validation reflects the fix
        cacheRef.current.clear();
      } catch (err) {
        console.error('[useSmartValidation] fix failed', err);
      }
    },
    [issues],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const canPublish = enabled
    ? errorCount === 0 && selectedFormats.length > 0 && mediaFiles.length > 0
    : true;

  const isClean =
    enabled &&
    !isValidating &&
    visibleIssues.length === 0 &&
    selectedFormats.length > 0;

  return {
    issues: visibleIssues,
    errorCount,
    warningCount,
    infoCount,
    canPublish,
    isValidating,
    byPlatform,
    byCategory,
    fix,
    dismiss,
    isClean,
  };
}

// Re-export network helper so consumers only import this module
export { getNetworkFromFormat };
