import { Instagram } from 'lucide-react';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="container flex h-16 sm:h-18 items-center px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Instagram className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
          <h1 className="text-base sm:text-xl font-bold truncate">Aprovação de Conteúdo</h1>
        </div>
      </div>
    </header>
  );
};
