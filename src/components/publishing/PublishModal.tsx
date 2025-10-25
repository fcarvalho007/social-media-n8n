import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PublishProgress, PublishTarget, PostType } from '@/types/publishing';
import { Instagram, Linkedin, CheckCircle2, AlertCircle, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: Record<PublishTarget, boolean>;
  postType: PostType;
  mediaCount: number;
  scheduledTime?: Date;
  progress: Record<PublishTarget, PublishProgress>;
  onRetry?: (platform: PublishTarget) => void;
}

export function PublishModal({
  open,
  onOpenChange,
  targets,
  postType,
  mediaCount,
  scheduledTime,
  progress,
  onRetry,
}: PublishModalProps) {
  const activeTargets = Object.entries(targets)
    .filter(([_, active]) => active)
    .map(([target]) => target as PublishTarget);

  const allDone = activeTargets.every(
    (target) => progress[target]?.status === 'done' || progress[target]?.status === 'error'
  );

  const copyTechnicalDetails = (platform: PublishTarget) => {
    const details = progress[platform];
    
    // Sanitize sensitive data
    const sanitizedDetails = {
      platform,
      status: details.status,
      error: details.error || 'N/A',
      message: details.message || 'N/A',
      startedAt: details.startedAt || 'N/A',
      publishedAt: details.publishedAt || 'N/A',
      postUrl: details.postUrl || 'N/A',
      technicalDetails: details.technicalDetails || 'N/A',
    };
    
    const text = Object.entries(sanitizedDetails)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Detalhes técnicos copiados (sanitizados)');
  };

  const getIcon = (platform: PublishTarget) => {
    if (platform === 'instagram') return Instagram;
    if (platform === 'linkedin') return Linkedin;
    return Instagram;
  };

  const getStatusColor = (status: PublishProgress['status']) => {
    switch (status) {
      case 'done': return 'bg-success';
      case 'error': return 'bg-destructive';
      case 'uploading':
      case 'publishing': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: PublishProgress['status']) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'validating': return 'A validar';
      case 'uploading': return 'A carregar';
      case 'publishing': return 'A publicar';
      case 'done': return 'Concluído';
      case 'error': return 'Erro';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar Conteúdo</DialogTitle>
          <DialogDescription>
            {scheduledTime ? `Agendado para ${scheduledTime.toLocaleString('pt-PT')}` : 'Publicação imediata'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge variant="outline">{postType.replace('_', ' ')}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Média:</span>
              <span className="font-medium">{mediaCount} {mediaCount === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plataformas:</span>
              <span className="font-medium">{activeTargets.length}</span>
            </div>
          </div>

          {/* Platform Progress */}
          <div className="space-y-3">
            {activeTargets.map((target) => {
              const platformProgress = progress[target];
              const Icon = getIcon(target);
              
              return (
                <div key={target} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold capitalize">{target}</span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(platformProgress?.status || 'pending')}>
                      {platformProgress?.status === 'done' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {platformProgress?.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {(platformProgress?.status === 'uploading' || platformProgress?.status === 'publishing') && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      {getStatusLabel(platformProgress?.status || 'pending')}
                    </Badge>
                  </div>

                  {platformProgress && platformProgress.status !== 'pending' && (
                    <Progress value={platformProgress.progress} className="h-2" />
                  )}

                  {platformProgress?.message && (
                    <p className="text-xs text-muted-foreground">{platformProgress.message}</p>
                  )}

                  {platformProgress?.error && (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive">{platformProgress.error}</p>
                      <div className="flex gap-2">
                        {onRetry && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRetry(target)}
                            className="text-xs h-7"
                          >
                            Tentar Novamente
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyTechnicalDetails(target)}
                          className="text-xs h-7"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar Detalhes
                        </Button>
                      </div>
                    </div>
                  )}

                  {platformProgress?.postUrl && (
                    <a
                      href={platformProgress.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block"
                    >
                      Ver publicação →
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {allDone && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
