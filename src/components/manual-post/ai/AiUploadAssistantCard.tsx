import { AlertTriangle, CheckCircle2, Copy, Eye, FileText, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';

export type AiUploadAssistantStatus = 'idle' | 'transcribing' | 'generating' | 'done' | 'error' | 'blocked';

interface AiUploadAssistantCardProps {
  visible: boolean;
  status: AiUploadAssistantStatus;
  creditsRemaining: number;
  creditCost: number;
  errorMessage?: string | null;
  retryCount?: number;
  transcription?: string;
  onDismiss: () => void;
  onTranscribe: () => void;
  onRetry: () => void;
}

export function AiUploadAssistantCard({
  visible,
  status,
  creditsRemaining,
  creditCost,
  errorMessage,
  retryCount = 0,
  transcription = '',
  onDismiss,
  onTranscribe,
  onRetry,
}: AiUploadAssistantCardProps) {
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  if (!visible) return null;

  const loading = status === 'transcribing' || status === 'generating';
  const progress = status === 'transcribing' ? 45 : status === 'generating' ? 78 : status === 'done' ? 100 : 0;

  const copyTranscription = async () => {
    try {
      await navigator.clipboard.writeText(transcription);
      toast.success('Transcrição copiada');
    } catch {
      toast.error('Não foi possível copiar a transcrição');
    }
  };

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              {status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : status === 'error' || status === 'blocked' ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {status === 'transcribing' && 'A ouvir o vídeo...'}
                {status === 'generating' && 'A preparar os campos...'}
                {status === 'done' && 'Pronto! Campos preenchidos.'}
                {(status === 'idle' || status === 'blocked') && 'Queres que a IA prepare tudo por ti?'}
                {status === 'error' && 'Não foi possível concluir.'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status === 'done'
                  ? 'Revê, edita o que quiseres e publica quando estiver ao teu gosto.'
                  : status === 'error' || status === 'blocked'
                    ? errorMessage
                    : 'A IA transcreve o áudio e propõe legenda, variantes por rede, hashtags, primeiro comentário, alt text e título.'}
              </p>
            </div>
          </div>

          {loading && (
            <div className="space-y-2 rounded-lg border bg-background/70 p-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {status === 'transcribing' ? 'Passo 1 de 2: transcrever áudio' : 'Passo 2 de 2: a preparar os campos'}
              </p>
            </div>
          )}

          {status === 'idle' && (
            <p className="text-sm font-medium text-foreground">
              Custa {creditCost} créditos. Tens {creditsRemaining} restantes.
            </p>
          )}

          {status === 'done' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" className="h-12 gap-2" onClick={() => setTranscriptionOpen(true)} disabled={!transcription}>
                <Eye className="h-4 w-4" />
                Ver transcrição
              </Button>
              <Button type="button" variant="secondary" size="lg" className="h-12 gap-2" onClick={onDismiss}>
                <X className="h-4 w-4" />
                Fechar
              </Button>
            </div>
          ) : status === 'error' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" className="h-12 gap-2" onClick={onDismiss}>
                <FileText className="h-4 w-4" />
                Escrever manualmente
              </Button>
              <Button type="button" size="lg" className="h-12 gap-2" onClick={onRetry} disabled={retryCount >= 2}>
                <Wand2 className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : status === 'blocked' ? (
            <Button type="button" variant="outline" size="lg" className="h-12 gap-2" onClick={onDismiss}>
              <FileText className="h-4 w-4" />
              Continuar manualmente
            </Button>
          ) : !loading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" className="h-12 gap-2" onClick={onDismiss}>
                <FileText className="h-4 w-4" />
                Já tenho a legenda
              </Button>
              <Button type="button" size="lg" className="h-12 gap-2" onClick={onTranscribe}>
                <Wand2 className="h-4 w-4" />
                Transcrever
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" size="lg" className="h-12 gap-2" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              A processar
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={transcriptionOpen} onOpenChange={setTranscriptionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transcrição do vídeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={transcription} readOnly className="min-h-[320px] resize-none" />
            <Button type="button" variant="outline" className="gap-2" onClick={copyTranscription} disabled={!transcription}>
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
