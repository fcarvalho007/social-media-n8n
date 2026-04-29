import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
      <Popover>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-80 text-sm">
          {content === SECTION_TOOLTIPS.media ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">Tamanho máximo</p>
                <p className="text-muted-foreground">200MB por carregamento.</p>
              </div>
              <div>
                <p className="font-medium">Formatos aceites</p>
                <p className="text-muted-foreground">PNG, JPG, MP4 e MOV.</p>
              </div>
              <div>
                <p className="font-medium">Dimensões recomendadas</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>Reels: 1080x1920</li>
                  <li>Feed: 1080x1080</li>
                  <li>Stories: 1080x1920</li>
                </ul>
              </div>
            </div>
          ) : content === SECTION_TOOLTIPS.scheduling ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">Fuso horário</p>
                <p className="text-muted-foreground">Todas as horas usam Lisboa (WET/WEST).</p>
              </div>
              <div>
                <p className="font-medium">Publicar agora ou agendar</p>
                <p className="text-muted-foreground">“Publicar agora” envia assim que confirmares. “Agendar” guarda a publicação para a data e hora escolhidas.</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{content}</p>
          )}
        </PopoverContent>
      </Popover>
  );
}

export function getSectionTooltip(section: SectionKey): string {
  return SECTION_TOOLTIPS[section];
}

// Format-specific tooltips for NetworkFormatSelector
export const FORMAT_TOOLTIPS: Record<string, string> = {
  instagram_carousel: "1-50 imagens ou vídeos (API IG aceita máx. 10, receberá aviso)",
  instagram_image: "1 imagem, proporção 1:1 ou 4:5 recomendada",
  instagram_reel: "Vídeo vertical, 9:16, máx. 90 segundos",
  instagram_stories: "Imagem ou vídeo, 9:16, máx. 60 segundos",
  linkedin_post: "Texto com imagens ou vídeo opcional",
  linkedin_document: "PDF com múltiplas páginas (carrossel)",
  youtube_shorts: "Vídeo vertical, 9:16, máx. 60 segundos",
  youtube_video: "Vídeo horizontal, 16:9 recomendado",
  tiktok_video: "Vídeo vertical, 9:16, máx. 10 minutos",
  facebook_image: "Imagem ou vídeo, várias proporções suportadas",
  facebook_stories: "Imagem ou vídeo vertical, 9:16, máx. 60 segundos",
  facebook_reel: "Vídeo vertical, 9:16, máx. 90 segundos",
};
