import { Download, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface VideoAiToolsProps {
  visible: boolean;
  loadingAction: string | null;
  onGenerateSrt: () => void;
  onGenerateChapters: () => void;
  onExtractQuotes: () => void;
}

export function VideoAiTools({ visible, loadingAction, onGenerateSrt, onGenerateChapters, onExtractQuotes }: VideoAiToolsProps) {
  if (!visible) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Ferramentas de IA
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onGenerateSrt}><Download className="mr-2 h-4 w-4" />Gerar ficheiro SRT</DropdownMenuItem>
        <DropdownMenuItem onClick={onGenerateChapters}>Gerar capítulos</DropdownMenuItem>
        <DropdownMenuItem onClick={onExtractQuotes}>Extrair frases citáveis</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
