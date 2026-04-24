import { Download, FileText, Loader2, MessageSquareQuote, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface VideoAiToolsProps {
  visible: boolean;
  loadingAction: string | null;
  disabled?: boolean;
  onGenerateSrt: () => void;
  onGenerateChapters: () => void;
  onExtractQuotes: () => void;
}

export function VideoAiTools({ visible, loadingAction, disabled, onGenerateSrt, onGenerateChapters, onExtractQuotes }: VideoAiToolsProps) {
  if (!visible) return null;
  const isBusy = Boolean(loadingAction);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={disabled || isBusy}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Ferramentas de IA
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem disabled={disabled || isBusy} onClick={onGenerateSrt}><Download className="mr-2 h-4 w-4" />Gerar ficheiro SRT</DropdownMenuItem>
        <DropdownMenuItem disabled={disabled || isBusy} onClick={onGenerateChapters}><FileText className="mr-2 h-4 w-4" />Gerar capítulos</DropdownMenuItem>
        <DropdownMenuItem disabled={disabled || isBusy} onClick={onExtractQuotes}><MessageSquareQuote className="mr-2 h-4 w-4" />Extrair frases citáveis</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
