// Error classification and user-friendly messages for publishing

export interface ErrorInfo {
  title: string;
  description: string;
  action: string;
  isRetryable: boolean;
  source?: 'getlate' | 'platform' | 'internal' | 'unknown';
}

// Structured error from edge function
export interface StructuredError {
  message: string;
  code: string;
  source: 'getlate' | 'platform' | 'internal' | 'unknown';
  originalError: string;
  isRetryable: boolean;
  suggestedAction: string;
}

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  rate_limit: {
    title: 'Limite de ações',
    description: 'A plataforma bloqueou temporariamente. Aguarda 15-30 minutos.',
    action: 'Tenta novamente em 15min',
    isRetryable: true,
    source: 'platform',
  },
  media_processing: {
    title: 'Processamento de vídeo em curso',
    description: 'O Instagram está a processar o vídeo. Este processo pode demorar até 5 minutos.',
    action: 'Aguarda e verifica no Getlate.dev ou Instagram',
    isRetryable: true,
    source: 'platform',
  },
  account_error: {
    title: 'Conta não associada',
    description: 'A conta de rede social não está ligada ao teu utilizador Getlate.',
    action: 'Reconecta a conta no Getlate.dev',
    isRetryable: false,
    source: 'getlate',
  },
  token_expired: {
    title: 'Token expirado',
    description: 'A sessão com a rede social expirou. É necessário reconectar a conta.',
    action: 'Reconecta a conta no Getlate.dev',
    isRetryable: false,
    source: 'platform',
  },
  auth_error: {
    title: 'Sessão expirada',
    description: 'A tua sessão na app expirou.',
    action: 'Faz login novamente',
    isRetryable: false,
    source: 'internal',
  },
  caption_error: {
    title: 'Erro na legenda',
    description: 'A legenda contém caracteres, links ou hashtags inválidos para a plataforma.',
    action: 'Revê e edita a legenda',
    isRetryable: false,
    source: 'platform',
  },
  media_error: {
    title: 'Erro no ficheiro',
    description: 'O formato, tamanho ou proporção do ficheiro não é suportado pela plataforma.',
    action: 'Redimensiona para 4:5 (1080x1350px)',
    isRetryable: false,
    source: 'platform',
  },
  network_error: {
    title: 'Erro de ligação',
    description: 'Não foi possível comunicar com o servidor.',
    action: 'Verifica a internet e tenta novamente',
    isRetryable: true,
    source: 'internal',
  },
  quota_exceeded: {
    title: 'Quota esgotada',
    description: 'Atingiste o limite de publicações do plano Getlate.',
    action: 'Aguarda pelo reset ou faz upgrade',
    isRetryable: false,
    source: 'getlate',
  },
  api_error: {
    title: 'Erro do servidor',
    description: 'O servidor Getlate retornou um erro temporário.',
    action: 'Tenta novamente em alguns minutos',
    isRetryable: true,
    source: 'getlate',
  },
  duplicate_content: {
    title: 'Conteúdo duplicado',
    description: 'Este conteúdo já foi publicado ou está em publicação nesta conta nas últimas 24h.',
    action: 'Verifica no Instagram/Getlate se já está publicado, ou altera a legenda',
    isRetryable: false,
    source: 'getlate',
  },
  upload_error: {
    title: 'Erro no upload',
    description: 'Não foi possível carregar os ficheiros para o servidor.',
    action: 'Tenta novamente',
    isRetryable: true,
    source: 'internal',
  },
  filename_invalid: {
    title: 'Nome do ficheiro incompatível',
    description: 'O nome do ficheiro contém caracteres especiais ([], acentos, espaços) que impedem o upload.',
    action: 'Renomeie o ficheiro usando apenas letras, números e hífens',
    isRetryable: false,
    source: 'internal',
  },
  file_too_large: {
    title: 'Ficheiro demasiado grande',
    description: 'O ficheiro excede o tamanho máximo permitido.',
    action: 'Reduza o tamanho do ficheiro antes de enviar',
    isRetryable: false,
    source: 'internal',
  },
  file_format_unsupported: {
    title: 'Formato não suportado',
    description: 'O tipo de ficheiro não é suportado pela plataforma.',
    action: 'Use formatos como JPG, PNG, MP4 ou MOV',
    isRetryable: false,
    source: 'internal',
  },
  unknown: {
    title: 'Erro inesperado',
    description: 'Ocorreu um problema desconhecido.',
    action: 'Tenta novamente ou contacta o suporte',
    isRetryable: true,
    source: 'unknown',
  },
};

// Parse structured error from edge function response
export function parseStructuredError(error: any): StructuredError | null {
  if (error && typeof error === 'object' && error.code && error.source) {
    return {
      message: error.message || 'Erro desconhecido',
      code: error.code,
      source: error.source,
      originalError: error.originalError || error.message,
      isRetryable: error.isRetryable ?? true,
      suggestedAction: error.suggestedAction || 'Tenta novamente',
    };
  }
  return null;
}

// Get error info from structured error or fallback to classification
export function getErrorInfoFromStructured(structuredError: StructuredError): ErrorInfo {
  const codeToKey: Record<string, string> = {
    'RATE_LIMIT': 'rate_limit',
    'ACCOUNT_ERROR': 'account_error',
    'TOKEN_EXPIRED': 'token_expired',
    'AUTH_ERROR': 'auth_error',
    'CAPTION_ERROR': 'caption_error',
    'MEDIA_ERROR': 'media_error',
    'NETWORK_ERROR': 'network_error',
    'QUOTA_EXCEEDED': 'quota_exceeded',
    'API_ERROR': 'api_error',
    'UPLOAD_ERROR': 'upload_error',
    'DUPLICATE_CONTENT': 'duplicate_content',
    'UNKNOWN': 'unknown',
  };
  
  const key = codeToKey[structuredError.code] || 'unknown';
  const baseInfo = ERROR_MESSAGES[key] || ERROR_MESSAGES.unknown;
  
  // Override with structured error's suggested action if more specific
  return {
    ...baseInfo,
    action: structuredError.suggestedAction || baseInfo.action,
    source: structuredError.source,
    isRetryable: structuredError.isRetryable,
  };
}

export function classifyError(errorMessage: string | undefined): string {
  if (!errorMessage) return 'unknown';
  
  const lower = errorMessage.toLowerCase();
  
  // Media processing errors (Instagram video carousel)
  if (lower.includes('media processing failed') || lower.includes('status_code":"error"')) {
    return 'media_processing';
  }
  
  // Rate limit errors
  if (lower.includes('too many actions') || lower.includes('rate limit') || lower.includes('429') || lower.includes('please wait') || lower.includes('media container')) {
    return 'rate_limit';
  }
  
  // Account/permission errors (403, accounts not belonging to user)
  if (lower.includes('403') || lower.includes('forbidden') || 
      lower.includes('do not belong') || lower.includes('permission denied') ||
      (lower.includes('account') && lower.includes('user'))) {
    return 'account_error';
  }
  
  // Token/OAuth specific errors
  if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid') || lower.includes('code 190'))) {
    return 'token_expired';
  }
  if (lower.includes('oauth') || lower.includes('session has expired')) {
    return 'token_expired';
  }
  
  // Generic auth errors
  if (lower.includes('auth') || lower.includes('session') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'auth_error';
  }
  
  // Caption/content errors
  if (lower.includes('caption') || lower.includes('character') || 
      (lower.includes('text') && (lower.includes('long') || lower.includes('invalid'))) ||
      (lower.includes('hashtag') && lower.includes('invalid')) ||
      (lower.includes('link') && lower.includes('invalid'))) {
    return 'caption_error';
  }
  
  // Enhanced media error detection for aspect ratio, dimensions, resize issues
  if (lower.includes('media') || lower.includes('format') || lower.includes('size') || 
      lower.includes('aspect') || lower.includes('ratio') || lower.includes('unsupported') ||
      lower.includes('width') || lower.includes('height') || lower.includes('resize') ||
      lower.includes('dimension') || lower.includes('resolution') || lower.includes('pixel') ||
      lower.includes('image') || lower.includes('allowed range')) {
    return 'media_error';
  }
  
  // Network/connectivity errors
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || lower.includes('fetch') || lower.includes('econnrefused')) {
    return 'network_error';
  }
  
  // Quota errors
  if (lower.includes('quota') || lower.includes('limit exceeded') || lower.includes('upload limit')) {
    return 'quota_exceeded';
  }
  
  // Upload errors
  if (lower.includes('upload') || lower.includes('carregar')) {
    return 'upload_error';
  }
  
  // API/server errors
  if (lower.includes('api') || lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('internal server')) {
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

// Classify error from string message and HTTP status code
// Used when edge function returns error as string instead of structured object
export function classifyErrorFromString(errorString: string, httpStatus?: number): StructuredError {
  const lower = errorString.toLowerCase();
  
  // Duplicate content protection (Getlate 409 anti-duplication)
  if (lower.includes('exact content') || lower.includes('already scheduled') ||
      lower.includes('within the last 24 hours') || lower.includes('already published') ||
      (httpStatus === 409 && (lower.includes('content') || lower.includes('duplicate') || lower.includes('already')))) {
    return {
      message: 'Conteúdo duplicado',
      code: 'DUPLICATE_CONTENT',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Verifica no Instagram se já foi publicado, ou altera ligeiramente a legenda para republicar',
    };
  }
  
  // Account not associated (403, "do not belong")
  if (lower.includes('do not belong') || lower.includes('not belong') || 
      lower.includes('permission denied') || lower.includes('forbidden') ||
      httpStatus === 403) {
    return {
      message: 'Conta não associada',
      code: 'ACCOUNT_ERROR',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'A conta não está ligada ao teu utilizador Getlate. Reconecta em getlate.dev/accounts',
    };
  }
  
  // Media processing failed (Instagram video carousel)
  if (lower.includes('media processing failed') || lower.includes('status_code":"error"')) {
    return {
      message: 'Processamento de vídeo em curso',
      code: 'MEDIA_PROCESSING',
      source: 'platform',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'O Instagram pode demorar até 5 minutos a processar vídeos. Verifica o status no Getlate.dev',
    };
  }
  
  // Rate limit (429)
  if (lower.includes('rate limit') || lower.includes('too many') || 
      lower.includes('please wait') || lower.includes('media container') ||
      httpStatus === 429) {
    return {
      message: 'Limite de ações atingido',
      code: 'RATE_LIMIT',
      source: 'platform',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Aguarda 15-30 minutos e tenta novamente',
    };
  }
  
  // Token expired / OAuth issues
  if (lower.includes('token') || lower.includes('expired') || 
      lower.includes('oauth') || lower.includes('session has expired') ||
      lower.includes('code 190')) {
    return {
      message: 'Sessão expirada',
      code: 'TOKEN_EXPIRED',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Reconecta a conta no Getlate.dev',
    };
  }
  
  // Media errors (format, size, aspect ratio)
  if (lower.includes('media') || lower.includes('image') || lower.includes('video') || 
      lower.includes('size') || lower.includes('format') || lower.includes('aspect') ||
      lower.includes('dimension') || lower.includes('resolution') || lower.includes('pixel') ||
      lower.includes('width') || lower.includes('height') || lower.includes('allowed range')) {
    return {
      message: 'Problema com ficheiros de média',
      code: 'MEDIA_ERROR',
      source: 'platform',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Verifica as dimensões (4:5 ou 1:1) e formato dos ficheiros',
    };
  }
  
  // Caption errors
  if (lower.includes('caption') || lower.includes('character') || 
      lower.includes('text') && (lower.includes('long') || lower.includes('invalid')) ||
      lower.includes('hashtag') && lower.includes('invalid')) {
    return {
      message: 'Erro na legenda',
      code: 'CAPTION_ERROR',
      source: 'platform',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Revê e edita a legenda',
    };
  }
  
  // Quota exceeded
  if (lower.includes('quota') || lower.includes('limit exceeded') || lower.includes('upload limit')) {
    return {
      message: 'Quota esgotada',
      code: 'QUOTA_EXCEEDED',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Aguarda pelo reset ou faz upgrade do plano',
    };
  }
  
  // Network errors
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || 
      lower.includes('fetch') || lower.includes('econnrefused') || lower.includes('abort')) {
    return {
      message: 'Erro de ligação',
      code: 'NETWORK_ERROR',
      source: 'internal',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Verifica a internet e tenta novamente',
    };
  }
  
  // API/server errors (5xx)
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || 
      lower.includes('internal server') || lower.includes('api error') ||
      (httpStatus && httpStatus >= 500)) {
    return {
      message: 'Erro do servidor',
      code: 'API_ERROR',
      source: httpStatus && httpStatus >= 500 ? 'getlate' : 'internal',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Tenta novamente em alguns minutos',
    };
  }
  
  // Edge Function specific error
  if (lower.includes('edge function') || lower.includes('non-2xx')) {
    return {
      message: 'Erro na comunicação com servidor',
      code: 'API_ERROR',
      source: 'internal',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Tenta novamente. Se persistir, contacta o suporte.',
    };
  }
  
  // Fallback - use short error if possible
  return {
    message: errorString.length < 80 ? errorString : 'Erro na publicação',
    code: 'UNKNOWN',
    source: httpStatus && httpStatus < 500 ? 'getlate' : 'internal',
    isRetryable: true,
    originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
    suggestedAction: 'Tenta novamente. Se persistir, contacta o suporte.',
  };
}

// Get source label in Portuguese
export function getSourceLabel(source: string): { label: string; emoji: string } {
  switch (source) {
    case 'getlate':
      return { label: 'Getlate', emoji: '🔗' };
    case 'platform':
      return { label: 'Rede Social', emoji: '📱' };
    case 'internal':
      return { label: 'Interno', emoji: '⚙️' };
    default:
      return { label: 'Desconhecido', emoji: '❓' };
  }
}
