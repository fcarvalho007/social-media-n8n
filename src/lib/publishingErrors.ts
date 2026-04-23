// Error classification and user-friendly messages for publishing

export type ErrorSeverity = 'info' | 'warning' | 'critical';
export type WhenToRetry = 'immediate' | 'short' | 'long' | 'never' | 'auto';
export type ErrorSource = 'getlate' | 'platform' | 'internal' | 'unknown';

export interface ErrorInfo {
  // Legacy fields (mantidos para retrocompatibilidade)
  title: string;
  description: string;
  action: string;
  isRetryable: boolean;
  source?: ErrorSource;
  // Novos campos para mensagens humanizadas
  plainExplanation: string;  // 1-2 frases de "porquê", linguagem simples
  whatToDo: string[];        // 1-3 passos accionáveis
  whenToRetry: WhenToRetry;
  severity: ErrorSeverity;
}

// Structured error from edge function
export interface StructuredError {
  message: string;
  code: string;
  source: ErrorSource;
  originalError: string;
  isRetryable: boolean;
  suggestedAction: string;
}

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  rate_limit: {
    title: 'A rede social pediu uma pausa',
    description: 'A plataforma bloqueou temporariamente. Aguarda 15-30 minutos.',
    action: 'Tenta novamente em 15min',
    isRetryable: true,
    source: 'platform',
    plainExplanation: 'A rede social bloqueou temporariamente os pedidos por segurança (excesso de tentativas). Não há nada de errado com a tua publicação.',
    whatToDo: [
      'Aguarda 15 a 30 minutos',
      'Volta a tentar — vai funcionar normalmente',
    ],
    whenToRetry: 'short',
    severity: 'warning',
  },
  media_processing: {
    title: 'A rede social está a processar o vídeo',
    description: 'O Instagram está a processar o vídeo. Este processo pode demorar até 5 minutos.',
    action: 'Aguarda alguns minutos',
    isRetryable: true,
    source: 'platform',
    plainExplanation: 'O Instagram está a converter o teu vídeo. Isto demora normalmente entre 1 e 5 minutos. A publicação aparece sozinha quando estiver pronta.',
    whatToDo: [
      'Não precisas fazer nada — aguarda',
      'Verifica o calendário daqui a 5 minutos',
    ],
    whenToRetry: 'auto',
    severity: 'info',
  },
  account_error: {
    title: 'A conta da rede social não está ligada',
    description: 'A conta de rede social não está ligada ao teu utilizador.',
    action: 'Reconecta a conta',
    isRetryable: false,
    source: 'getlate',
    plainExplanation: 'A conta que estás a tentar usar para publicar não está associada à tua conta da app. Pode ter sido desligada ou nunca ter sido configurada.',
    whatToDo: [
      'Vai a Definições → Contas Sociais',
      'Liga a conta clicando em "Reconectar"',
      'Volta aqui e tenta publicar novamente',
    ],
    whenToRetry: 'never',
    severity: 'critical',
  },
  token_expired: {
    title: 'A ligação à rede social caducou',
    description: 'A sessão com a rede social expirou. É necessário reconectar a conta.',
    action: 'Reconecta a conta',
    isRetryable: false,
    source: 'platform',
    plainExplanation: 'Por segurança, a rede social desliga periodicamente as ligações. Precisas de autorizar a app outra vez para publicar.',
    whatToDo: [
      'Vai a Definições → Contas Sociais',
      'Clica em "Reconectar" na conta afectada',
      'Autoriza no ecrã da rede social',
    ],
    whenToRetry: 'never',
    severity: 'critical',
  },
  auth_error: {
    title: 'A tua sessão na app expirou',
    description: 'A tua sessão na app expirou.',
    action: 'Faz login novamente',
    isRetryable: false,
    source: 'internal',
    plainExplanation: 'Por inactividade, a tua sessão na app foi terminada. Basta voltar a entrar para continuar.',
    whatToDo: [
      'Faz login novamente',
      'Volta a tentar a publicação',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  caption_error: {
    title: 'A legenda tem um problema',
    description: 'A legenda contém caracteres, links ou hashtags inválidos para a plataforma.',
    action: 'Revê e edita a legenda',
    isRetryable: false,
    source: 'platform',
    plainExplanation: 'A rede social rejeitou a legenda. Pode ter caracteres inválidos, hashtags banidas, demasiados links, ou estar acima do limite de caracteres.',
    whatToDo: [
      'Revê a legenda — remove emojis ou símbolos estranhos',
      'Reduz o número de hashtags',
      'Encurta o texto se for muito longo',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  media_error: {
    title: 'Há um problema com a imagem ou vídeo',
    description: 'O formato, tamanho ou proporção do ficheiro não é suportado pela plataforma.',
    action: 'Verifica as dimensões',
    isRetryable: false,
    source: 'platform',
    plainExplanation: 'A rede social não aceitou o ficheiro. Pode ser por causa do tamanho, formato (JPG, PNG, MP4) ou proporção (4:5 ou 1:1 para Instagram).',
    whatToDo: [
      'Para Instagram, usa imagens 4:5 (1080x1350px) ou quadradas 1:1',
      'Verifica que o ficheiro está em JPG, PNG ou MP4',
      'Se for vídeo, confirma que tem menos de 60 segundos para Reels',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  network_error: {
    title: 'Falhou a comunicação',
    description: 'Não foi possível comunicar com o servidor.',
    action: 'Verifica a internet e tenta novamente',
    isRetryable: true,
    source: 'internal',
    plainExplanation: 'Não conseguimos chegar à rede social. Pode ser problema da tua internet ou da rede social estar com problemas momentâneos.',
    whatToDo: [
      'Verifica que tens ligação à internet',
      'Aguarda alguns segundos e tenta novamente',
    ],
    whenToRetry: 'immediate',
    severity: 'warning',
  },
  quota_exceeded: {
    title: 'Atingiste o limite diário de publicações',
    description: 'Atingiste o limite de publicações do plano.',
    action: 'Aguarda pelo reset diário',
    isRetryable: false,
    source: 'getlate',
    plainExplanation: 'Já fizeste o número máximo de publicações permitidas hoje. O contador é reposto à meia-noite (hora de Lisboa).',
    whatToDo: [
      'Aguarda até amanhã para publicar novamente',
      'Ou contacta o admin para aumentar o limite',
    ],
    whenToRetry: 'long',
    severity: 'critical',
  },
  api_error: {
    title: 'O serviço está com problemas momentâneos',
    description: 'O servidor retornou um erro temporário.',
    action: 'Tenta novamente em alguns minutos',
    isRetryable: true,
    source: 'getlate',
    plainExplanation: 'Houve um problema técnico com o serviço de publicação. Normalmente resolve-se sozinho em poucos minutos.',
    whatToDo: [
      'Aguarda 2 a 5 minutos',
      'Volta a tentar',
    ],
    whenToRetry: 'short',
    severity: 'warning',
  },
  duplicate_content: {
    title: 'Já publicaste esta legenda hoje',
    description: 'Este conteúdo já foi publicado nesta conta nas últimas 24h.',
    action: 'Edita a legenda ou usa "Adicionar variação"',
    isRetryable: false,
    source: 'getlate',
    plainExplanation: 'A rede social não permite repetir exactamente a mesma legenda no mesmo dia (regra anti-spam). Basta alterar uma palavra ou adicionar uma variação subtil.',
    whatToDo: [
      'Edita a legenda — acrescenta ou troca uma palavra',
      'Ou usa o botão "Adicionar variação subtil" (acrescenta um caractere invisível)',
      'Verifica primeiro no Instagram se a publicação anterior já está visível',
    ],
    whenToRetry: 'immediate',
    severity: 'warning',
  },
  upload_error: {
    title: 'Não conseguimos guardar os ficheiros',
    description: 'Não foi possível carregar os ficheiros para o servidor.',
    action: 'Tenta novamente',
    isRetryable: true,
    source: 'internal',
    plainExplanation: 'Houve um problema ao guardar as imagens ou vídeos. Pode ser por internet instável ou por algum ficheiro ter um problema.',
    whatToDo: [
      'Verifica a internet',
      'Tenta publicar de novo',
      'Se persistir, remove e volta a adicionar os ficheiros',
    ],
    whenToRetry: 'immediate',
    severity: 'warning',
  },
  filename_invalid: {
    title: 'O nome de um ficheiro tem caracteres não permitidos',
    description: 'O nome contém caracteres especiais que impedem o upload.',
    action: 'Renomeia o ficheiro',
    isRetryable: false,
    source: 'internal',
    plainExplanation: 'Um ficheiro tem parênteses, colchetes, espaços ou acentos no nome. O servidor não consegue guardar com esses caracteres.',
    whatToDo: [
      'Renomeia usando apenas letras, números e hífens',
      'Exemplo: "minha [foto] (final).jpg" → "minha-foto-final.jpg"',
      'Volta a adicionar o ficheiro',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  file_too_large: {
    title: 'Um ficheiro é demasiado grande',
    description: 'O ficheiro excede o tamanho máximo permitido.',
    action: 'Reduz o tamanho do ficheiro',
    isRetryable: false,
    source: 'internal',
    plainExplanation: 'A imagem (máx. 50MB) ou o vídeo (máx. 650MB) ultrapassa o limite. Tens de comprimir antes de enviar.',
    whatToDo: [
      'Para imagens, usa um compressor online (TinyPNG, Squoosh)',
      'Para vídeos, exporta numa resolução menor ou usa HandBrake',
      'Volta a adicionar o ficheiro reduzido',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  file_format_unsupported: {
    title: 'O formato do ficheiro não é aceite',
    description: 'O tipo de ficheiro não é suportado pela plataforma.',
    action: 'Converte para JPG, PNG, MP4 ou MOV',
    isRetryable: false,
    source: 'internal',
    plainExplanation: 'A rede social só aceita certos formatos: JPG ou PNG para imagens, MP4 ou MOV para vídeos. Tens um formato diferente (HEIC, AVI, etc.).',
    whatToDo: [
      'Converte a imagem para JPG ou PNG',
      'Converte o vídeo para MP4',
      'Volta a adicionar o ficheiro convertido',
    ],
    whenToRetry: 'never',
    severity: 'warning',
  },
  linkedin_document_error: {
    title: 'O PDF do LinkedIn tem um problema',
    description: 'Falhou a geração ou validação do documento PDF para LinkedIn.',
    action: 'Verifica páginas e tamanho do PDF',
    isRetryable: true,
    source: 'platform',
    plainExplanation: 'O LinkedIn rejeitou o documento. Pode ser por exceder o limite de 300 páginas, peso > 100MB, ou as imagens enviadas terem falhado a converter para PDF.',
    whatToDo: [
      'Confirma que o documento tem ≤ 300 páginas e ≤ 100MB',
      'Reduz o número ou o peso das imagens originais',
      'Volta a tentar — a maioria dos casos resolve numa segunda tentativa',
    ],
    whenToRetry: 'short',
    severity: 'warning',
  },
  unknown: {
    title: 'Algo correu mal mas não conseguimos identificar o quê',
    description: 'Ocorreu um problema desconhecido.',
    action: 'Tenta novamente ou contacta o suporte',
    isRetryable: true,
    source: 'unknown',
    plainExplanation: 'Houve uma falha que não conseguimos classificar automaticamente. Pode ser temporária. Se persistir, copia o código de erro abaixo e envia ao suporte.',
    whatToDo: [
      'Tenta publicar novamente',
      'Se voltar a falhar, copia os "Detalhes técnicos" e envia ao suporte',
    ],
    whenToRetry: 'short',
    severity: 'warning',
  },
};

// Map whenToRetry → user-friendly text
export function getRetryGuidance(when: WhenToRetry): string {
  switch (when) {
    case 'immediate': return 'Podes tentar agora';
    case 'short': return 'Aguarda 5 a 15 minutos';
    case 'long': return 'Aguarda 1 hora ou mais';
    case 'never': return 'Esta falha não desaparece sozinha — segue os passos acima';
    case 'auto': return 'Vamos tentar automaticamente — não precisas fazer nada';
  }
}

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
    'MEDIA_PROCESSING': 'media_processing',
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
    'LINKEDIN_DOCUMENT_ERROR': 'linkedin_document_error',
    'UNKNOWN': 'unknown',
  };
  
  const key = codeToKey[structuredError.code] || 'unknown';
  const baseInfo = ERROR_MESSAGES[key] || ERROR_MESSAGES.unknown;
  
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
  
  if (lower.includes('media processing failed') || lower.includes('status_code":"error"')) {
    return 'media_processing';
  }
  if (lower.includes('too many actions') || lower.includes('rate limit') || lower.includes('429') || lower.includes('please wait') || lower.includes('media container')) {
    return 'rate_limit';
  }
  if (lower.includes('403') || lower.includes('forbidden') || 
      lower.includes('do not belong') || lower.includes('permission denied') ||
      (lower.includes('account') && lower.includes('user'))) {
    return 'account_error';
  }
  if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid') || lower.includes('code 190'))) {
    return 'token_expired';
  }
  if (lower.includes('oauth') || lower.includes('session has expired')) {
    return 'token_expired';
  }
  if (lower.includes('auth') || lower.includes('session') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'auth_error';
  }
  if (lower.includes('caption') || lower.includes('character') || 
      (lower.includes('text') && (lower.includes('long') || lower.includes('invalid'))) ||
      (lower.includes('hashtag') && lower.includes('invalid')) ||
      (lower.includes('link') && lower.includes('invalid'))) {
    return 'caption_error';
  }
  if (lower.includes('media') || lower.includes('format') || lower.includes('size') || 
      lower.includes('aspect') || lower.includes('ratio') || lower.includes('unsupported') ||
      lower.includes('width') || lower.includes('height') || lower.includes('resize') ||
      lower.includes('dimension') || lower.includes('resolution') || lower.includes('pixel') ||
      lower.includes('image') || lower.includes('allowed range')) {
    return 'media_error';
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || lower.includes('fetch') || lower.includes('econnrefused')) {
    return 'network_error';
  }
  if (lower.includes('quota') || lower.includes('limit exceeded') || lower.includes('upload limit')) {
    return 'quota_exceeded';
  }
  if (lower.includes('upload') || lower.includes('carregar')) {
    return 'upload_error';
  }
  if (lower.includes('pdf') || lower.includes('linkedin_document') ||
      lower.includes('page count') || lower.includes('document generation') ||
      lower.includes('linkedin document')) {
    return 'linkedin_document_error';
  }
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
export function classifyErrorFromString(errorString: string, httpStatus?: number): StructuredError {
  const lower = errorString.toLowerCase();
  
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
  if (lower.includes('do not belong') || lower.includes('not belong') || 
      lower.includes('permission denied') || lower.includes('forbidden') ||
      httpStatus === 403) {
    return {
      message: 'Conta não associada',
      code: 'ACCOUNT_ERROR',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'A conta não está ligada. Reconecta em Definições → Contas Sociais',
    };
  }
  if (lower.includes('media processing failed') || lower.includes('status_code":"error"')) {
    return {
      message: 'Processamento de vídeo em curso',
      code: 'MEDIA_PROCESSING',
      source: 'platform',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'O Instagram pode demorar até 5 minutos a processar vídeos',
    };
  }
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
  if (lower.includes('token') || lower.includes('expired') || 
      lower.includes('oauth') || lower.includes('session has expired') ||
      lower.includes('code 190')) {
    return {
      message: 'Sessão expirada',
      code: 'TOKEN_EXPIRED',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Reconecta a conta em Definições → Contas Sociais',
    };
  }
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
  if (lower.includes('quota') || lower.includes('limit exceeded') || lower.includes('upload limit')) {
    return {
      message: 'Quota esgotada',
      code: 'QUOTA_EXCEEDED',
      source: 'getlate',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Aguarda pelo reset diário ou contacta o admin',
    };
  }
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
  const hasMediaContext = lower.includes('media') || lower.includes('image') ||
    lower.includes('video') || lower.includes('photo') || lower.includes('file');
  const hasMediaSpecifier = lower.includes('format') || lower.includes('size') ||
    lower.includes('aspect') || lower.includes('dimension') || lower.includes('resolution') ||
    lower.includes('pixel') || lower.includes('width') || lower.includes('height') ||
    lower.includes('allowed range') || lower.includes('ratio') || lower.includes('codec') ||
    lower.includes('mime') || lower.includes('extension') || lower.includes('duration') ||
    lower.includes('bitrate') || lower.includes('mb') || lower.includes('too large') ||
    lower.includes('too small');
  if (hasMediaContext && hasMediaSpecifier) {
    return {
      message: 'Problema com ficheiros de média',
      code: 'MEDIA_ERROR',
      source: 'platform',
      isRetryable: false,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Verifica as dimensões (4:5 ou 1:1) e formato dos ficheiros',
    };
  }

  if (lower.includes('pdf') || lower.includes('linkedin_document') ||
      lower.includes('page count') || lower.includes('document generation') ||
      lower.includes('linkedin document')) {
    return {
      message: 'Problema com o PDF do LinkedIn',
      code: 'LINKEDIN_DOCUMENT_ERROR',
      source: 'platform',
      isRetryable: true,
      originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
      suggestedAction: 'Reduz o número de páginas/peso do documento e tenta novamente',
    };
  }

  return {
    message: errorString.length < 80 ? errorString : 'Erro na publicação',
    code: 'UNKNOWN',
    source: httpStatus && httpStatus < 500 ? 'getlate' : 'internal',
    isRetryable: true,
    originalError: httpStatus ? `${httpStatus}: ${errorString}` : errorString,
    suggestedAction: 'Tenta novamente. Se persistir, contacta o suporte.',
  };
}

export function getSourceLabel(source: string): { label: string; emoji: string } {
  switch (source) {
    case 'getlate':
      return { label: 'Serviço de publicação', emoji: '🔗' };
    case 'platform':
      return { label: 'Rede social', emoji: '📱' };
    case 'internal':
      return { label: 'App', emoji: '⚙️' };
    default:
      return { label: 'Desconhecido', emoji: '❓' };
  }
}

// Helper to format current time in Lisbon TZ
function formatLisbonTime(): string {
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

// Build a copyable error report for support
export function getCopyableErrorReport(
  structuredError: StructuredError | null | undefined,
  context?: { postId?: string; platform?: string; rawError?: string }
): string {
  const sourceLabel = structuredError ? getSourceLabel(structuredError.source).label : 'Desconhecido';
  const lines: string[] = [
    '── Relatório de Erro ──',
    `Código: ${structuredError?.code || 'UNKNOWN'}`,
    `Origem: ${sourceLabel}`,
  ];
  if (context?.platform) lines.push(`Plataforma: ${context.platform}`);
  if (context?.postId) lines.push(`Post ID: ${context.postId}`);
  lines.push(`Mensagem: ${structuredError?.message || context?.rawError || 'Sem mensagem'}`);
  const technical = structuredError?.originalError || context?.rawError;
  if (technical && technical !== structuredError?.message) {
    lines.push(`Erro técnico: ${technical}`);
  }
  lines.push(`Hora: ${formatLisbonTime()}`);
  lines.push('────────────────────');
  return lines.join('\n');
}
