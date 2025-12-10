import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, ExternalLink, Plus, Calendar, 
  PartyPopper, AlertCircle, Loader2, Copy, Share2,
  Instagram, Linkedin, Youtube, Facebook, RefreshCw, Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PublishResult {
  platform: string;
  format: string;
  formatLabel: string;
  status: 'pending' | 'publishing' | 'success' | 'error';
  progress: number;
  postUrl?: string;
  errorMessage?: string;
}

interface PublishSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: PublishResult[];
  onCreateNew: () => void;
  onViewCalendar: () => void;
  onRetryFormat?: (format: string) => void;
}

const platformColors: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  facebook: '#1877F2',
  tiktok: '#000000',
};

const platformGradients: Record<string, string> = {
  instagram: 'linear-gradient(135deg, #E1306C, #F77737)',
  linkedin: 'linear-gradient(135deg, #0A66C2, #0073b1)',
  youtube: 'linear-gradient(135deg, #FF0000, #CC0000)',
  facebook: 'linear-gradient(135deg, #1877F2, #0866FF)',
  tiktok: 'linear-gradient(135deg, #00F2EA, #FF0050)',
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

// Detect if error is a rate limit error
const isRateLimitError = (errorMessage?: string): boolean => {
  if (!errorMessage) return false;
  const lowerMsg = errorMessage.toLowerCase();
  return lowerMsg.includes('too many actions') || 
         lowerMsg.includes('rate limit') ||
         lowerMsg.includes('media container') ||
         lowerMsg.includes('please wait') ||
         lowerMsg.includes('429');
};

export function PublishSuccessModal({
  isOpen,
  onClose,
  results,
  onCreateNew,
  onViewCalendar,
  onRetryFormat
}: PublishSuccessModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  const allCompleted = useMemo(() => 
    results.length > 0 && results.every(r => r.status === 'success' || r.status === 'error'),
    [results]
  );
  
  const allSuccess = useMemo(() => 
    results.length > 0 && results.every(r => r.status === 'success'),
    [results]
  );
  
  const successCount = useMemo(() => 
    results.filter(r => r.status === 'success').length,
    [results]
  );
  
  const failedCount = useMemo(() => 
    results.filter(r => r.status === 'error').length,
    [results]
  );

  // Trigger confetti when all successful
  useEffect(() => {
    if (allCompleted && allSuccess && isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, allSuccess, isOpen]);

  const handleCopyAllLinks = () => {
    const links = results
      .filter(r => r.postUrl)
      .map(r => r.postUrl)
      .join('\n');
    if (links) {
      navigator.clipboard.writeText(links);
      toast.success('Links copiados!');
    }
  };

  const handleShare = async () => {
    const links = results
      .filter(r => r.postUrl)
      .map(r => `${getPlatformName(r.platform)}: ${r.postUrl}`)
      .join('\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Publicações',
          text: links,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyAllLinks();
    }
  };

  const overallProgress = useMemo(() => {
    if (results.length === 0) return 0;
    const totalProgress = results.reduce((acc, r) => acc + r.progress, 0);
    return Math.round(totalProgress / results.length);
  }, [results]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="publish-success-modal sm:max-w-[480px] p-0 overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="confetti-particle"
                initial={{
                  opacity: 1,
                  x: '50%',
                  y: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [1, 1, 0],
                  x: `${Math.random() * 100}%`,
                  y: [0, -20, 400],
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

        <div className="p-6 pb-4">
          {/* Estado: A publicar */}
          {!allCompleted && (
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary/20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold">A publicar...</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aguarda enquanto publicamos o teu conteúdo
                </p>
              </div>

              {/* Progress por plataforma */}
              <div className="space-y-3">
                {results.map((result, index) => (
                  <motion.div 
                    key={index} 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${platformColors[result.platform]}15` }}
                      >
                        <PlatformIcon platform={result.platform} size={16} color={platformColors[result.platform]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {result.formatLabel}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {result.status === 'success' && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                            {result.status === 'error' && (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            {(result.status === 'publishing' || result.status === 'pending') && (
                              `${result.progress}%`
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={result.progress} 
                          className="h-1.5 mt-1"
                          style={{
                            '--progress-color': result.status === 'success' 
                              ? '#10B981' 
                              : result.status === 'error'
                              ? '#EF4444'
                              : platformColors[result.platform]
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Não feches esta janela...
              </p>
            </motion.div>
          )}

          {/* Estado: Resultados */}
          {allCompleted && (
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              {/* Ícone de sucesso ou parcial */}
              <motion.div 
                className="flex justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  allSuccess 
                    ? "bg-gradient-to-br from-green-400 to-emerald-600" 
                    : failedCount === results.length
                    ? "bg-gradient-to-br from-red-400 to-rose-600"
                    : "bg-gradient-to-br from-amber-400 to-orange-600"
                )}>
                  {allSuccess ? (
                    <PartyPopper className="h-8 w-8 text-white" />
                  ) : failedCount === results.length ? (
                    <X className="h-8 w-8 text-white" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-white" />
                  )}
                </div>
              </motion.div>
              
              {/* Título */}
              <div>
                <h2 className="text-xl font-bold">
                  {allSuccess 
                    ? '🎉 Publicado com sucesso!' 
                    : failedCount === results.length
                    ? 'Falha na publicação'
                    : `Publicado em ${successCount} de ${results.length}`
                  }
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date().toLocaleString('pt-PT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {/* Cards de resultado */}
              <div className="grid grid-cols-2 gap-3">
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      "result-card relative rounded-xl p-4 text-center",
                      result.status === 'success' && "result-card-success",
                      result.status === 'error' && "result-card-error"
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    style={{
                      '--platform-color': platformColors[result.platform]
                    } as React.CSSProperties}
                  >
                    {/* Status badge */}
                    <div className={cn(
                      "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md",
                      result.status === 'success' ? "bg-green-500" : "bg-red-500"
                    )}>
                      {result.status === 'success' ? (
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      ) : (
                        <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      )}
                    </div>
                    
                    {/* Platform icon */}
                    <div 
                      className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ 
                        background: `${platformColors[result.platform]}15`
                      }}
                    >
                      <PlatformIcon 
                        platform={result.platform} 
                        size={24} 
                        color={platformColors[result.platform]}
                      />
                    </div>
                    
                    {/* Platform name */}
                    <p className="font-semibold text-sm">{getPlatformName(result.platform)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{result.formatLabel}</p>
                    
                    {/* Link or error */}
                    {result.status === 'success' && result.postUrl ? (
                      <a
                        href={result.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-background border border-border hover:bg-muted transition-colors"
                      >
                        Ver publicação
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : result.status === 'error' ? (
                      <div className="mt-2 space-y-2">
                        {isRateLimitError(result.errorMessage) ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
                            <Clock className="h-3 w-3" />
                            <span>Rate limit - aguarda 15min</span>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 truncate" title={result.errorMessage}>
                            {result.errorMessage || 'Erro ao publicar'}
                          </p>
                        )}
                        {onRetryFormat && (
                          <button
                            onClick={() => onRetryFormat(result.format)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Tentar novamente
                          </button>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </div>
              
              {/* Quick actions para links */}
              {successCount > 1 && (
                <div className="flex justify-center gap-3">
                  <button 
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={handleCopyAllLinks}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar links
                  </button>
                  <button 
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    Partilhar
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer com ações */}
        {allCompleted && (
          <motion.div
            className="flex gap-3 p-4 pt-0 border-t bg-muted/30"
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
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              onClick={onCreateNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar nova
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
