// Error classification and user-friendly messages for publishing

export interface ErrorInfo {
  title: string;
  description: string;
  action: string;
  isRetryable: boolean;
}

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  rate_limit: {
    title: 'Limite de ações',
    description: 'O Instagram bloqueou temporariamente. Aguarda 15-30 minutos.',
    action: 'Tenta novamente em 15min',
    isRetryable: true,
  },
  auth_error: {
    title: 'Sessão expirada',
    description: 'A ligação com a rede social expirou.',
    action: 'Reconecta a conta',
    isRetryable: false,
  },
  media_error: {
    title: 'Erro no ficheiro',
    description: 'O formato ou tamanho do ficheiro não é suportado.',
    action: 'Verifica os requisitos',
    isRetryable: false,
  },
  network_error: {
    title: 'Erro de ligação',
    description: 'Não foi possível comunicar com o servidor.',
    action: 'Verifica a internet',
    isRetryable: true,
  },
  quota_exceeded: {
    title: 'Quota esgotada',
    description: 'Atingiste o limite de publicações do plano.',
    action: 'Aguarda pelo reset',
    isRetryable: false,
  },
  api_error: {
    title: 'Erro da API',
    description: 'A API da rede social retornou um erro.',
    action: 'Tenta novamente',
    isRetryable: true,
  },
  upload_error: {
    title: 'Erro no upload',
    description: 'Não foi possível carregar os ficheiros.',
    action: 'Tenta novamente',
    isRetryable: true,
  },
  unknown: {
    title: 'Erro inesperado',
    description: 'Ocorreu um problema desconhecido.',
    action: 'Tenta novamente',
    isRetryable: true,
  },
};

export function classifyError(errorMessage: string | undefined): string {
  if (!errorMessage) return 'unknown';
  
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes('too many actions') || lower.includes('rate limit') || lower.includes('429') || lower.includes('please wait') || lower.includes('media container')) {
    return 'rate_limit';
  }
  if (lower.includes('auth') || lower.includes('token') || lower.includes('session') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'auth_error';
  }
  if (lower.includes('media') || lower.includes('format') || lower.includes('size') || lower.includes('aspect') || lower.includes('unsupported')) {
    return 'media_error';
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || lower.includes('fetch')) {
    return 'network_error';
  }
  if (lower.includes('quota') || lower.includes('limit exceeded')) {
    return 'quota_exceeded';
  }
  if (lower.includes('upload') || lower.includes('carregar')) {
    return 'upload_error';
  }
  if (lower.includes('api') || lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    return 'api_error';
  }
  
  return 'unknown';
}

export function getErrorInfo(errorMessage: string | undefined): ErrorInfo {
  const errorType = classifyError(errorMessage);
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.unknown;
}

export function isRateLimitError(errorMessage: string | undefined): boolean {
  return classifyError(errorMessage) === 'rate_limit';
}
