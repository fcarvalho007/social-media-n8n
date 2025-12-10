import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SectionHelpProps {
  content: string;
  className?: string;
}

const SECTION_TOOLTIPS = {
  platforms: "Seleciona uma ou mais plataformas e formatos para a tua publicação",
  media: "Carrega as imagens ou vídeos. Para carrosséis, a ordem pode ser alterada arrastando",
  caption: "A legenda será adaptada a cada plataforma se necessário",
  scheduling: "Publica agora ou agenda para o melhor momento",
};

export type SectionKey = keyof typeof SECTION_TOOLTIPS;

export function SectionHelp({ content, className }: SectionHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            className={cn(
              "inline-flex items-center justify-center p-1 rounded-full",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
            aria-label="Ajuda"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-xs text-sm"
          sideOffset={5}
        >
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getSectionTooltip(section: SectionKey): string {
  return SECTION_TOOLTIPS[section];
}

// Format-specific tooltips for NetworkFormatSelector
export const FORMAT_TOOLTIPS: Record<string, string> = {
  instagram_carousel: "1-10 imagens ou vídeos, proporção 1:1 ou 4:5 recomendada",
  instagram_image: "1 imagem, proporção 1:1 ou 4:5 recomendada",
  instagram_reel: "Vídeo vertical, 9:16, máx. 90 segundos",
  instagram_stories: "Imagem ou vídeo, 9:16, máx. 15 segundos",
  linkedin_post: "Texto com imagens ou vídeo opcional",
  linkedin_document: "PDF com múltiplas páginas (carrossel)",
  youtube_shorts: "Vídeo vertical, 9:16, máx. 60 segundos",
  youtube_video: "Vídeo horizontal, 16:9 recomendado",
  tiktok_video: "Vídeo vertical, 9:16, máx. 3 minutos",
  facebook_image: "Imagem ou vídeo, várias proporções suportadas",
  facebook_stories: "Imagem ou vídeo vertical, 9:16",
  facebook_reel: "Vídeo vertical, 9:16, máx. 90 segundos",
};
