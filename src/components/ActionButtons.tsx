import { Button } from '@/components/ui/button';
import { LayoutGrid, Video, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  className?: string;
}

export const ActionButtons = ({ className }: ActionButtonsProps) => {
  return (
    <div className={cn("space-y-4 md:space-y-6", className)}>
      {/* Section Header */}
      <div className="space-y-2 md:space-y-3">
        <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-foreground">Criar nova publicação</h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Escolha o tipo de conteúdo que pretende criar. Todos os botões redirecionam para formulários externos do Google Forms para facilitar o processo de criação.
        </p>
      </div>

      {/* Action Buttons Grid - Optimized for mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Carrossel Button */}
        <Button 
          size="lg"
          className="h-auto min-h-[100px] md:min-h-[110px] py-5 md:py-6 px-4 md:px-5 flex-col gap-2.5 md:gap-3 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg touch-feedback text-base md:text-lg"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-6 w-6 md:h-7 md:w-7" />
            <span className="font-semibold">Carrossel</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm opacity-90">
            <Clock className="h-4 w-4" />
            <span>🕒 5 min a processar</span>
          </div>
        </Button>

        {/* Stories Button */}
        <Button 
          size="lg"
          variant="secondary"
          className="h-auto min-h-[100px] md:min-h-[110px] py-5 md:py-6 px-4 md:px-5 flex-col gap-2.5 md:gap-3 bg-secondary hover:bg-secondary/80 shadow-md hover:shadow-lg touch-feedback text-base md:text-lg"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
        >
          <div className="flex items-center gap-2.5">
            <Video className="h-6 w-6 md:h-7 md:w-7" />
            <span className="font-semibold">Stories</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm opacity-75">
            <Clock className="h-4 w-4" />
            <span>🕒 2 min a processar</span>
          </div>
        </Button>

        {/* Post Individual Button (Disabled) */}
        <Button 
          size="lg"
          variant="outline"
          disabled
          className="h-auto min-h-[100px] md:min-h-[110px] py-5 md:py-6 px-4 md:px-5 flex-col gap-2.5 md:gap-3 cursor-not-allowed opacity-40 text-base md:text-lg"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="h-6 w-6 md:h-7 md:w-7" />
            <span className="font-semibold">Post Individual</span>
          </div>
          <span className="text-xs md:text-sm font-medium">Em breve</span>
        </Button>
      </div>
    </div>
  );
};
