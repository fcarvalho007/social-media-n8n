import { useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetTrigger, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { useAuth } from '@/contexts/AuthContext';
import { DESTINOS_NAVEGACAO, itemNavegacaoAtivo } from '@/lib/navegacao';
import { toast } from 'sonner';

export const GRUPOS_MENU = (['Trabalho', 'Publicação', 'Análise', 'Conta'] as const).map((titulo) => ({
  titulo, itens: DESTINOS_NAVEGACAO.filter((d) => d.grupo === titulo),
}));
export const itemAtivo = itemNavegacaoAtivo;

export function MenuNavegacao({ open, onOpenChange, gatilho }: { open: boolean; onOpenChange: (v: boolean) => void; gatilho: ReactNode }) {
  const { counts } = usePendingCounts();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const totalPending = counts.stories + counts.carousels + counts.posts;

  const [aSair, setASair] = useState(false);
  const sair = async () => {
    if (aSair) return;
    setASair(true);
    try { await signOut(); onOpenChange(false); navigate('/auth'); }
    catch { toast.error('Não foi possível terminar a sessão. Tenta de novo.'); }
    finally { setASair(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{gatilho}</SheetTrigger>
      <SheetContent side="left" className="flex w-[min(20rem,88vw)] flex-col gap-0 overflow-y-auto bg-background p-0">
        <SheetHeader className="border-b px-5 py-4 pr-16 text-left">
          <SheetTitle className="text-base">Hub de conteúdo</SheetTitle>
          <SheetDescription className="truncate text-xs">{user?.email ?? 'Menu principal'}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-5 px-3 py-4">
          {GRUPOS_MENU.map((g) => (
            <div key={g.titulo}>
              <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.titulo}</h2>
              <ul>
                {g.itens.map((i) => {
                  const ativo = itemAtivo(pathname, search, i.url);
                  return (
                    <li key={i.url}>
                      <Link
                        to={i.url}
                        onClick={() => onOpenChange(false)}
                        aria-current={ativo ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-md px-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          ativo ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <i.icon className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="flex-1">{i.label}</span>
                        {i.badge && totalPending > 0 && (
                          <span className="rounded-full bg-destructive px-2 text-xs font-semibold text-destructive-foreground" aria-label={`${totalPending} por aprovar`}>{totalPending}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {g.titulo === 'Conta' && (
                  <li>
                    <button type="button" disabled={aSair} onClick={sair} className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-[15px] text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <LogOut className="h-5 w-5" aria-hidden />{aSair ? 'A sair…' : 'Sair'}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
