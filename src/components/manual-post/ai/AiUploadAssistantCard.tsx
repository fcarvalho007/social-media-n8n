import { Sparkles, FileText, Wand2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AiUploadAssistantCardProps {
  visible: boolean;
  loading: boolean;
  onDismiss: () => void;
  onTranscribe: () => void;
}

export function AiUploadAssistantCard({ visible, loading, onDismiss, onTranscribe }: AiUploadAssistantCardProps) {
  if (!visible) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Queres que a IA prepare tudo por ti?</h3>
            <p className="text-sm text-muted-foreground">
              A IA transcreve o áudio e propõe legenda, variantes por rede, hashtags, primeiro comentário, alt text e título do rascunho. Podes editar tudo.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 rounded-lg border bg-background/70 p-3">
            <p className="text-sm font-medium">A ouvir o vídeo e a preparar os campos… (15-20 segundos)</p>
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" size="lg" className="h-12 gap-2" onClick={onDismiss}>
              <FileText className="h-4 w-4" />
              Já tenho a legenda
            </Button>
            <Button type="button" size="lg" className="h-12 gap-2" onClick={onTranscribe}>
              <Wand2 className="h-4 w-4" />
              Transcrever com IA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
