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
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de conteúdo que pretende criar. Todos os botões redirecionam para formulários externos do Google Forms para facilitar o processo de criação.
        </p>
      </div>

      {/* Action Buttons Grid - More compact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Carrossel Button */}
        <Button 
          size="lg"
          className="h-auto min-h-[90px] py-5 px-4 flex-col gap-2.5 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all touch-target"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            <span className="font-semibold">Carrossel</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <Clock className="h-3.5 w-3.5" />
            <span>🕒 5 m a processar</span>
          </div>
        </Button>

        {/* Stories Button */}
        <Button 
          size="lg"
          variant="secondary"
          className="h-auto min-h-[90px] py-5 px-4 flex-col gap-2.5 bg-secondary hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-[0.98] transition-all touch-target"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
        >
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
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
          className="h-auto min-h-[90px] py-5 px-4 flex-col gap-2.5 cursor-not-allowed opacity-40"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="font-semibold">Post Individual</span>
          </div>
          <span className="text-xs font-medium">Em breve</span>
        </Button>
      </div>
    </div>
  );
};
