import { Button } from '@/components/ui/button';
import { LayoutGrid, Video, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  className?: string;
}

export const ActionButtons = ({ className }: ActionButtonsProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Section Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Criar nova publicação</h2>
        <p className="text-sm text-muted-foreground">Escolha o tipo de conteúdo que pretende criar</p>
      </div>

      {/* Action Buttons Grid - 8px spacing grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Carrossel Button - Blue Primary */}
        <Button 
          size="lg"
          className="h-auto min-h-[110px] py-6 px-4 flex-col gap-3 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98] transition-all touch-target"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            <span className="font-semibold">Carrossel</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <Clock className="h-3.5 w-3.5" />
            <span>🕒 5 m a processar</span>
          </div>
        </Button>

        {/* Stories Button - Neutral Gray */}
        <Button 
          size="lg"
          variant="secondary"
          className="h-auto min-h-[110px] py-6 px-4 flex-col gap-3 bg-secondary hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-[0.98] transition-all touch-target"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
        >
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            <span className="font-semibold">Stories</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-75">
            <Clock className="h-3.5 w-3.5" />
            <span>🕒 2 m a processar</span>
          </div>
        </Button>

        {/* Post Individual Button (Disabled) */}
        <Button 
          size="lg"
          variant="outline"
          disabled
          className="h-auto min-h-[110px] py-6 px-4 flex-col gap-3 cursor-not-allowed opacity-40 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            <span className="font-semibold">Post Individual</span>
          </div>
          <span className="text-xs font-medium">Em breve</span>
        </Button>
      </div>
    </div>
  );
};
