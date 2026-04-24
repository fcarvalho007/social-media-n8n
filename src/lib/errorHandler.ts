import { toast } from 'sonner';

export type AIErrorCode = 'rate_limit' | 'insufficient_credits' | 'timeout' | 'generic';

export class AIServiceError extends Error {
  code: AIErrorCode;
  status?: number;

  constructor(message: string, code: AIErrorCode = 'generic', status?: number) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.status = status;
  }
}

const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  rate_limit: 'A IA está ocupada. Tenta novamente em alguns segundos.',
  insufficient_credits: 'Não tens créditos suficientes. Vê planos.',
  timeout: 'A IA demorou demasiado. Tenta novamente.',
  generic: 'A IA está temporariamente indisponível.',
};

export function getAIErrorCode(error: unknown): AIErrorCode {
  if (error instanceof AIServiceError) return error.code;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  if (message.includes('rate') || message.includes('429')) return 'rate_limit';
  if (message.includes('crédito') || message.includes('credit') || message.includes('402')) return 'insufficient_credits';
  if (message.includes('timeout') || message.includes('demorou')) return 'timeout';
  return 'generic';
}

export function handleAIError(error: unknown, options?: { showToast?: boolean }) {
  const code = getAIErrorCode(error);
  const message = AI_ERROR_MESSAGES[code];
  if (options?.showToast !== false) toast.error(message);
  return { code, message };
}
