import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, ExternalLink, Calendar, 
  PartyPopper, AlertCircle, Loader2, Copy, Share2,
  Instagram, Linkedin, Youtube, Facebook, RefreshCw, Clock,
  Upload, Globe, Plus, Download, FileText, Image, Video,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getErrorInfo, 
  isRateLimitError, 
  parseStructuredError, 
  getErrorInfoFromStructured,
  getSourceLabel,
  type StructuredError 
} from '@/lib/publishingErrors';
import { downloadFailedPublicationAssets, downloadSingleFile, copyToClipboard } from '@/lib/downloadUtils';

// Types
export type Phase1Status = 'idle' | 'uploading' | 'sending' | 'success' | 'error';
export type Phase2Status = 'idle' | 'waiting' | 'publishing' | 'success' | 'partial' | 'error';
export type PlatformStatus = 'pending' | 'processing' | 'success' | 'error';

export interface PlatformResult {
  platform: string;
  format: string;
  formatLabel: string;
  status: PlatformStatus;
  postUrl?: string;
  errorMessage?: string;
  structuredError?: StructuredError;
}

export interface PublishProgress {
  phase1: {
    status: Phase1Status;
    progress: number;
    message: string;
    errorMessage?: string;
  };
  phase2: {
    status: Phase2Status;
    progress: number;
    message: string;
    platforms: PlatformResult[];
  };
  summary: {
    totalPlatforms: number;
    successCount: number;
    failedCount: number;
  };
}

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: PublishProgress;
  onCreateNew: () => void;
  onViewCalendar: () => void;
  onRetryPlatform?: (format: string) => void;
  mediaFiles?: File[];
  caption?: string;
}

// Platform styling
const platformColors: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  facebook: '#1877F2',
  tiktok: '#000000',
};

const PlatformIcon = ({ platform, size = 18, className, color }: { platform: string; size?: number; className?: string; color?: string }) => {
  const iconProps = { size, className, style: color ? { color } : undefined };
  switch (platform) {
    case 'instagram': return <Instagram {...iconProps} />;
    case 'linkedin': return <Linkedin {...iconProps} />;
    case 'youtube': return <Youtube {...iconProps} />;
    case 'facebook': return <Facebook {...iconProps} />;
    default: return <Instagram {...iconProps} />;
  }
};

const getPlatformName = (platform: string): string => {
  const names: Record<string, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    facebook: 'Facebook',
    tiktok: 'TikTok',
  };
  return names[platform] || platform;
};

// Phase Card Component
function PhaseCard({ 
  number, 
  title, 
  status, 
  progress, 
  message,
  errorMessage,
  children 
}: { 
  number: number;
  title: string;
  status: 'idle' | 'active' | 'success' | 'error';
  progress: number;
  message: string;
  errorMessage?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-all duration-300",
      status === 'idle' && "border-border/50 bg-muted/20 opacity-60",
      status === 'active' && "border-primary bg-primary/5 shadow-sm",
      status === 'success' && "border-green-500/50 bg-green-500/5",
      status === 'error' && "border-red-500/50 bg-red-500/5"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Phase badge */}
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
          status === 'idle' && "bg-muted text-muted-foreground",
          status === 'active' && "bg-primary text-primary-foreground",
          status === 'success' && "bg-green-500 text-white",
          status === 'error' && "bg-red-500 text-white"
        )}>
          {status === 'success' ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : status === 'error' ? (
            <X className="h-4 w-4" strokeWidth={3} />
          ) : (
            number
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{title}</span>
            {status === 'active' && (
              <span className="text-xs text-muted-foreground">{progress}%</span>
            )}
          </div>
          <p className={cn(
            "text-xs mt-0.5",
            status === 'error' ? "text-red-600" : "text-muted-foreground"
          )}>
            {errorMessage || message}
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      {(status === 'active' || status === 'success') && (
        <Progress 
          value={progress} 
          className={cn(
            "h-2",
            status === 'success' && "[&>[data-state=complete]]:bg-green-500"
          )}
        />
      )}
      
      {/* Children (platform list for phase 2) */}
      {children}
    </div>
  );
}

// Platform Status Row with enhanced error display
function PlatformStatusRow({ 
  result, 
  onRetry 
}: { 
  result: PlatformResult;
  onRetry?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Try to parse structured error first, then fall back to string classification
  const structuredError = result.structuredError || (result.errorMessage ? parseStructuredError(result.errorMessage) : null);
  const errorInfo = structuredError 
    ? getErrorInfoFromStructured(structuredError) 
    : (result.errorMessage ? getErrorInfo(result.errorMessage) : null);
  const isRateLimit = isRateLimitError(result.errorMessage);
  
  const sourceInfo = structuredError ? getSourceLabel(structuredError.source) : null;
  
  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 rounded-lg transition-all duration-300",
      result.status === 'pending' && "bg-muted/30",
      result.status === 'processing' && "bg-primary/5 ring-2 ring-primary/30 animate-pulse",
      result.status === 'success' && "bg-green-500/10",
      result.status === 'error' && "bg-red-500/10"
    )}>
      <div className="flex items-center gap-3">
        {/* Platform icon */}
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${platformColors[result.platform]}15` }}
        >
          <PlatformIcon platform={result.platform} size={18} color={platformColors[result.platform]} />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{getPlatformName(result.platform)}</span>
            <span className="text-xs text-muted-foreground truncate">{result.formatLabel}</span>
          </div>
          
          {result.status === 'pending' && (
            <span className="text-xs text-muted-foreground">A aguardar...</span>
          )}
          
          {result.status === 'processing' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-primary flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                A processar...
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
          )}
          
          {result.status === 'success' && (
            <span className="text-xs text-green-600">Publicado com sucesso</span>
          )}
          
          {result.status === 'error' && (
            <div className="space-y-1">
              {/* Error title with source badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-red-600 font-medium">
                  {errorInfo?.title || 'Erro'}
                </span>
                {sourceInfo && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30">
                    {sourceInfo.emoji} {sourceInfo.label}
                  </Badge>
                )}
              </div>
              
              {/* Error description */}
              {isRateLimit ? (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {errorInfo?.description}
                </span>
              ) : (
                <span className="text-xs text-red-600/80">
                  {errorInfo?.description || result.errorMessage || 'Erro ao publicar'}
                </span>
              )}
              
              {/* Suggested action */}
              {errorInfo?.action && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  💡 {errorInfo.action}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {result.status === 'success' && result.postUrl && (
          <a
            href={result.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
          >
            Ver <ExternalLink className="h-3 w-3" />
          </a>
        )}
        
        {result.status === 'error' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {structuredError?.originalError && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors"
                title="Ver detalhes técnicos"
              >
                <Info className="h-3 w-3" />
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {onRetry && errorInfo?.isRetryable && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Technical details (collapsible) */}
      {result.status === 'error' && showDetails && structuredError?.originalError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="ml-12 mt-1"
        >
          <div className="bg-muted/50 rounded p-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">Detalhes técnicos:</p>
            <code className="text-[10px] text-muted-foreground break-all block">
              {structuredError.originalError}
            </code>
          </div>
          
          {/* Contextual action buttons */}
          <div className="flex gap-2 mt-2">
            {(structuredError.code === 'ACCOUNT_ERROR' || structuredError.code === 'TOKEN_EXPIRED') && (
              <a
                href="https://getlate.dev/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir Getlate.dev
              </a>
            )}
            {structuredError.code === 'MEDIA_ERROR' && (
              <button
                onClick={() => toast.info('Dica: Usa proporção 4:5 (1080x1350px) ou 1:1 (1080x1080px) para melhor compatibilidade.')}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Info className="h-3 w-3" />
                Ver requisitos
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function PublishProgressModal({
  isOpen,
  onClose,
  progress,
  onCreateNew,
  onViewCalendar,
  onRetryPlatform,
  mediaFiles = [],
  caption = ''
}: PublishProgressModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { phase1, phase2, summary } = progress;
  
  // Determine overall state
  const isPhase1Active = phase1.status === 'uploading' || phase1.status === 'sending';
  const isPhase1Done = phase1.status === 'success' || phase1.status === 'error';
  const isPhase2Active = phase2.status === 'publishing';
  const isPhase2Done = phase2.status === 'success' || phase2.status === 'partial' || phase2.status === 'error';
  const isComplete = isPhase1Done && isPhase2Done;
  const allSuccess = phase1.status === 'success' && phase2.status === 'success';
  const hasPartialSuccess = phase2.status === 'partial';
  const hasTotalFailure = phase1.status === 'error' || phase2.status === 'error';
  
  // Trigger confetti when all successful
  useEffect(() => {
    if (isComplete && allSuccess && isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, allSuccess, isOpen]);

  const handleCopyAllLinks = () => {
    const links = phase2.platforms
      .filter(r => r.postUrl)
      .map(r => r.postUrl)
      .join('\n');
    if (links) {
      navigator.clipboard.writeText(links);
      toast.success('Links copiados!');
    }
  };

  // Get phase 1 display status
  const getPhase1Status = (): 'idle' | 'active' | 'success' | 'error' => {
    if (phase1.status === 'uploading' || phase1.status === 'sending') return 'active';
    if (phase1.status === 'success') return 'success';
    if (phase1.status === 'error') return 'error';
    return 'idle';
  };
  
  // Get phase 2 display status
  const getPhase2Status = (): 'idle' | 'active' | 'success' | 'error' => {
    if (phase2.status === 'publishing') return 'active';
    if (phase2.status === 'success') return 'success';
    if (phase2.status === 'partial' || phase2.status === 'error') return 'error';
    if (phase2.status === 'waiting') return 'idle';
    return 'idle';
  };

  // Get header config
  const getHeaderConfig = () => {
    if (!isComplete) {
      return {
        icon: <Loader2 className="h-8 w-8 text-white animate-spin" />,
        title: isPhase1Active ? 'A enviar ficheiros...' : 'A publicar...',
        bgColor: 'bg-primary',
        showProgress: true,
      };
    }
    
    if (allSuccess) {
      return {
        icon: <PartyPopper className="h-8 w-8 text-white" />,
        title: 'Publicado com sucesso!',
        bgColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
        showProgress: false,
      };
    }
    
    if (hasPartialSuccess) {
      return {
        icon: <AlertCircle className="h-8 w-8 text-white" />,
        title: `Publicado em ${summary.successCount} de ${summary.totalPlatforms}`,
        bgColor: 'bg-gradient-to-br from-amber-400 to-orange-600',
        showProgress: false,
      };
    }
    
    return {
      icon: <X className="h-8 w-8 text-white" />,
      title: phase1.status === 'error' ? 'Falha no envio' : 'Falha na plataforma',
      bgColor: 'bg-gradient-to-br from-red-400 to-rose-600',
      showProgress: false,
    };
  };
  
  const headerConfig = getHeaderConfig();

  return (
    <Dialog open={isOpen} onOpenChange={() => isComplete && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  opacity: 1,
                  x: '50%',
                  y: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [1, 1, 0],
                  x: `${Math.random() * 100}%`,
                  y: [0, -20, 350],
                  scale: [0, 1, 0.5],
                  rotate: [0, Math.random() * 360, Math.random() * 720],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.3,
                  ease: 'easeOut',
                }}
                style={{
                  background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#34D399'][Math.floor(Math.random() * 6)],
                  width: 8 + Math.random() * 8,
                  height: 8 + Math.random() * 8,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                }}
              />
            ))}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Header */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div 
              className={cn(
                "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg",
                headerConfig.bgColor
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              {headerConfig.icon}
            </motion.div>
            
            <h2 className="text-xl font-bold">{headerConfig.title}</h2>
            
            {!isComplete && (
              <p className="text-sm text-muted-foreground mt-1">
                Não feches esta janela
              </p>
            )}
            
            {isComplete && (
              <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {new Date().toLocaleString('pt-PT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </motion.div>

          {/* Phase 1: Envio para servidor */}
          <PhaseCard
            number={1}
            title="Envio para servidor"
            status={getPhase1Status()}
            progress={phase1.progress}
            message={phase1.message}
            errorMessage={phase1.errorMessage}
          />

          {/* Phase 2: Publicação nas redes */}
          <PhaseCard
            number={2}
            title="Publicação nas redes sociais"
            status={getPhase2Status()}
            progress={phase2.progress}
            message={phase2.message}
          >
            {/* Platform list */}
            {phase2.platforms.length > 0 && (phase2.status !== 'idle' && phase2.status !== 'waiting') && (
              <div className="mt-4 space-y-2">
                {phase2.platforms.map((result, idx) => (
                  <motion.div
                    key={result.format}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <PlatformStatusRow
                      result={result}
                      onRetry={result.status === 'error' && onRetryPlatform 
                        ? () => onRetryPlatform(result.format) 
                        : undefined
                      }
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </PhaseCard>

          {/* Content Download Section - Always visible when complete and has media */}
          {isComplete && mediaFiles.length > 0 && (
            <motion.div
              className={cn(
                "rounded-xl border p-4 sm:p-5",
                hasTotalFailure || hasPartialSuccess 
                  ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5"
                  : "border-border bg-muted/30"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  hasTotalFailure || hasPartialSuccess 
                    ? "bg-amber-500/20"
                    : "bg-primary/10"
                )}>
                  <Download className={cn(
                    "h-4 w-4",
                    hasTotalFailure || hasPartialSuccess 
                      ? "text-amber-600"
                      : "text-primary"
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {hasTotalFailure || hasPartialSuccess ? 'Recuperação Rápida' : 'Download do Conteúdo'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {hasTotalFailure || hasPartialSuccess 
                      ? 'Descarregue os ficheiros para publicar manualmente'
                      : 'Guarde um ZIP com ficheiros + legenda (backup)'}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons - Stack on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-5">
                <Button
                  variant={hasTotalFailure || hasPartialSuccess ? "default" : "outline"}
                  size="default"
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      await downloadFailedPublicationAssets(mediaFiles, caption);
                      toast.success('ZIP descarregado!');
                    } catch (err) {
                      toast.error('Erro ao criar ZIP');
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="flex-1 gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download ZIP
                </Button>
                
                {caption && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={async () => {
                      const success = await copyToClipboard(caption);
                      if (success) {
                        toast.success('Legenda copiada!');
                      } else {
                        toast.error('Erro ao copiar');
                      }
                    }}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar Legenda
                  </Button>
                )}
              </div>
              
              {/* Media Thumbnails Grid - Responsive */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 sm:mb-3">
                  Ficheiros ({mediaFiles.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {mediaFiles.slice(0, 9).map((file, idx) => {
                    const isVideo = file.type.startsWith('video/');
                    const previewUrl = URL.createObjectURL(file);
                    const showPlusIndicator = idx === 8 && mediaFiles.length > 9;
                    
                    if (showPlusIndicator) {
                      return (
                        <button
                          key={idx}
                          onClick={async () => {
                            setIsDownloading(true);
                            try {
                              await downloadFailedPublicationAssets(mediaFiles, caption);
                              toast.success('ZIP descarregado!');
                            } catch (err) {
                              toast.error('Erro ao criar ZIP');
                            } finally {
                              setIsDownloading(false);
                            }
                          }}
                          className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          title="Download todos os ficheiros"
                        >
                          <span className="text-sm font-semibold">+{mediaFiles.length - 8}</span>
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          downloadSingleFile(file);
                          toast.success(`${file.name} descarregado`);
                        }}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors group"
                        title={`Download ${file.name}`}
                      >
                        {isVideo ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={previewUrl}
                            alt={`Media ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Download className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        {isVideo && (
                          <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 sm:px-1.5 py-0.5">
                            <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick actions for links */}
          {isComplete && summary.successCount > 0 && (
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={handleCopyAllLinks}
              >
                <Copy className="h-4 w-4" />
                Copiar links
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer com ações */}
        {isComplete && (
          <motion.div
            className="flex gap-3 p-4 border-t bg-muted/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button 
              variant="outline"
              className="flex-1"
              onClick={onViewCalendar}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendário
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={onCreateNew}
            >
              <Plus className="h-4 w-4" />
              Nova publicação
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
