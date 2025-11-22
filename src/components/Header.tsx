import { Instagram } from 'lucide-react';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="container flex h-12 sm:h-14 items-center px-4 sm:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <h1 className="text-sm sm:text-lg font-bold truncate">Aprovação de Conteúdo</h1>
        </div>
      </div>
    </header>
  );
};
