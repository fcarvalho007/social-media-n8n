import { Button } from '@/components/ui/button';
import { LayoutGrid, Video, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  className?: string;
}

export const ActionButtons = ({ className }: ActionButtonsProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-px bg-border flex-1" />
        <h3 className="text-sm font-medium text-muted-foreground">Criar nova publicação</h3>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Carrossel Button */}
        <Button 
          size="lg"
          className="h-auto py-4 flex-col gap-2 bg-primary hover:bg-primary/90 active:scale-95 transition-all"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-sm font-semibold">Carrossel</span>
          </div>
          <div className="flex items-center gap-1 text-xs opacity-90">
            <Clock className="h-3 w-3" />
            <span>5m a processar</span>
          </div>
        </Button>

        {/* Stories Button */}
        <Button 
          size="lg"
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95 transition-all"
          onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
        >
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            <span className="text-sm font-semibold">Stories</span>
          </div>
          <div className="flex items-center gap-1 text-xs opacity-75">
            <Clock className="h-3 w-3" />
            <span>2m a processar</span>
          </div>
        </Button>

        {/* Post Individual Button (Disabled) */}
        <Button 
          size="lg"
          variant="outline"
          disabled
          className="h-auto py-4 flex-col gap-2 cursor-not-allowed opacity-40"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="text-sm font-semibold">Post Individual</span>
          </div>
          <span className="text-xs">Em breve</span>
        </Button>
      </div>
    </div>
  );
};
