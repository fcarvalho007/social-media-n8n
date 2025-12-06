import { useEffect, useState } from 'react';
import { Rocket, CheckCircle, Loader2, Upload, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishingOverlayProps {
  isVisible: boolean;
  progress: number;
  currentNetwork?: string;
  stage?: 'uploading' | 'generating_pdf' | 'publishing' | 'success';
}

const stageMessages = {
  uploading: 'A carregar ficheiros...',
  generating_pdf: 'A gerar PDF...',
  publishing: 'A publicar...',
  success: 'Publicação enviada!',
};

const stageIcons = {
  uploading: Upload,
  generating_pdf: Loader2,
  publishing: Rocket,
  success: CheckCircle,
};

export function PublishingOverlay({ isVisible, progress, currentNetwork, stage = 'publishing' }: PublishingOverlayProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible || stage === 'success') return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    
    return () => clearInterval(interval);
  }, [isVisible, stage]);

  if (!isVisible) return null;

  const Icon = stageIcons[stage];
  const message = stageMessages[stage];
  const isSuccess = stage === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col items-center gap-8 p-12 max-w-md mx-4">
        {/* Animated Icon */}
        <div className={cn(
          "relative flex items-center justify-center w-32 h-32 rounded-full",
          isSuccess 
            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20" 
            : "bg-gradient-to-br from-primary/20 to-primary/10"
        )}>
          {/* Pulse rings */}
          {!isSuccess && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-4 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            </>
          )}
          
          {/* Main icon container */}
          <div className={cn(
            "relative z-10 flex items-center justify-center w-20 h-20 rounded-full",
            isSuccess 
              ? "bg-gradient-to-br from-green-500 to-emerald-500" 
              : "bg-gradient-to-br from-primary to-primary/80"
          )}>
            <Icon className={cn(
              "w-10 h-10 text-primary-foreground",
              !isSuccess && stage !== 'uploading' && "animate-bounce",
              stage === 'uploading' && "animate-pulse",
              stage === 'generating_pdf' && "animate-spin"
            )} />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {isSuccess ? message : `${message}${dots}`}
          </h2>
          {currentNetwork && !isSuccess && (
            <p className="text-muted-foreground capitalize">
              {currentNetwork}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {!isSuccess && (
          <div className="w-full max-w-xs space-y-3">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
          </div>
        )}

        {/* Warning message */}
        {!isSuccess && (
          <p className="text-sm text-muted-foreground text-center">
            Não feche esta janela durante a publicação
          </p>
        )}

        {/* Success animation */}
        {isSuccess && (
          <div className="flex items-center gap-2 text-green-500 animate-scale-in">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Tudo pronto!</span>
          </div>
        )}
      </div>
    </div>
  );
}
