import { Download, FileText, Loader2, MessageSquareQuote, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MediaToolsPopoverProps {
  /** Pelo menos um dos blocos abaixo deve ser visível para renderizar. */
  hasVideo: boolean;
  hasImages: boolean;
  loadingAction: string | null;
  disabled?: boolean;
  onGenerateSrt?: () => void;
  onGenerateChapters?: () => void;
  onExtractQuotes?: () => void;
  /** Regenera alt text para todos os ficheiros de imagem (ou apenas o primeiro). */
  onRegenerateAllAltText?: () => void;
  altTextLoading?: boolean;
}

interface ToolItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  onClick?: () => void;
  loading?: boolean;
}

/**
 * Popover único e adaptativo de "Ferramentas" para o Step2 (Média).
 *
 * Junta o que antes eram dois botões/menus separados:
 *  - Ferramentas de vídeo (SRT, capítulos, quotes) — só com vídeo presente.
 *  - Ferramentas de IA para imagens (regenerar alt text) — só com imagens.
 *
 * Renderização adaptativa: secções vazias não aparecem; cabeçalhos com
 * título por grupo só são mostrados se ambos os grupos estiverem presentes
 * (para reduzir ruído quando só há um tipo de média).
 */
export function MediaToolsPopover({
  hasVideo,
  hasImages,
  loadingAction,
  disabled,
  onGenerateSrt,
  onGenerateChapters,
  onExtractQuotes,
  onRegenerateAllAltText,
  altTextLoading,
}: MediaToolsPopoverProps) {
  const videoItems: ToolItem[] = hasVideo
    ? [
        { id: 'srt', label: 'Gerar ficheiro SRT', description: 'Legendas .srt para upload manual', icon: Download, onClick: onGenerateSrt, loading: loadingAction === 'srt' },
        { id: 'chapters', label: 'Gerar capítulos', description: 'Marcadores temporais para YouTube', icon: FileText, onClick: onGenerateChapters, loading: loadingAction === 'chapters' },
        { id: 'quotes', label: 'Extrair frases citáveis', description: 'Quotes prontas para legendas', icon: MessageSquareQuote, onClick: onExtractQuotes, loading: loadingAction === 'quotes' },
      ]
    : [];

  const imageItems: ToolItem[] = hasImages && onRegenerateAllAltText
    ? [
        { id: 'alt-text', label: 'Regenerar alt text', description: 'Descreve todas as imagens com IA', icon: Wand2, onClick: onRegenerateAllAltText, loading: !!altTextLoading },
      ]
    : [];

  if (videoItems.length === 0 && imageItems.length === 0) return null;

  const showHeaders = videoItems.length > 0 && imageItems.length > 0;
  const isBusy = !!loadingAction || !!altTextLoading;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10"
          disabled={disabled}
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
          )}
          <span className="text-xs font-medium">Ferramentas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-72 p-2">
        <div className="space-y-1">
          {videoItems.length > 0 && (
            <>
              {showHeaders && (
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Vídeo
                </p>
              )}
              {videoItems.map((item) => (
                <ToolButton key={item.id} item={item} disabled={disabled || isBusy} />
              ))}
            </>
          )}
          {videoItems.length > 0 && imageItems.length > 0 && <Separator className="my-1" />}
          {imageItems.length > 0 && (
            <>
              {showHeaders && (
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Imagens
                </p>
              )}
              {imageItems.map((item) => (
                <ToolButton key={item.id} item={item} disabled={disabled || isBusy} />
              ))}
            </>
          )}
          <Separator className="my-1" />
          <p className="px-2 py-1 text-[11px] text-muted-foreground">
            Cada acção consome créditos de IA.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToolButton({ item, disabled }: { item: ToolItem; disabled?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      disabled={disabled || !item.onClick}
      onClick={item.onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {item.loading ? (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" strokeWidth={1.5} />
      ) : (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-tight">{item.label}</span>
        <span className="block text-[11px] text-muted-foreground">{item.description}</span>
      </span>
    </button>
  );
}
