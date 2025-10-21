import { Button } from '@/components/ui/button';
import { Images, Video, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  className?: string;
  variant?: 'horizontal' | 'grid';
}

export const ActionButtons = ({ className, variant = 'horizontal' }: ActionButtonsProps) => {
  return (
    <div 
      className={cn(
        "flex gap-2 sm:gap-3",
        variant === 'grid' && "grid grid-cols-3",
        className
      )}
    >
      <Button 
        size="lg"
        className="flex-1 h-11 sm:h-12 min-h-[44px] gap-2 bg-primary hover:bg-primary/90 active:scale-95 transition-transform"
        onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
      >
        <Images className="h-5 w-5 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-semibold truncate">Carrossel</span>
      </Button>

      <Button 
        size="lg"
        variant="outline"
        className="flex-1 h-11 sm:h-12 min-h-[44px] gap-2 hover:bg-accent active:scale-95 transition-transform"
        onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
      >
        <Video className="h-5 w-5 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-semibold truncate">Stories</span>
      </Button>

      <Button 
        size="lg"
        variant="outline"
        disabled
        className="flex-1 h-11 sm:h-12 min-h-[44px] gap-2 cursor-not-allowed opacity-40"
      >
        <Construction className="h-5 w-5 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-semibold truncate">Post Individual</span>
      </Button>
    </div>
  );
};
