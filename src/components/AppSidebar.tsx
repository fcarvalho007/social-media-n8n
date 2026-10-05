import { CheckCircle2, PlusCircle, Calendar, FolderKanban, LayoutDashboard, LogOut, Image, BarChart3, Lightbulb, Mail, ShieldCheck, Settings, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { useAuth } from '@/contexts/AuthContext';

interface Item { label: string; icon: LucideIcon; url: string; badge?: boolean }
interface Grupo { titulo: string; itens: Item[] }

export const GRUPOS_MENU: Grupo[] = [
  {
    titulo: 'Trabalho',
    itens: [
      { label: 'Painel', icon: LayoutDashboard, url: '/' },
      { label: 'Criar SM', icon: PlusCircle, url: '/pending?tab=create' },
      { label: 'Newsletter', icon: Mail, url: '/newsletter' },
      { label: 'Aprovar', icon: CheckCircle2, url: '/pending', badge: true },
      { label: 'Calendário', icon: Calendar, url: '/calendar' },
      { label: 'Projetos', icon: FolderKanban, url: '/projects' },
    ],
  },
  { titulo: 'Análise', itens: [
    { label: 'Analytics', icon: BarChart3, url: '/analytics' },
    { label: 'Insights', icon: Lightbulb, url: '/insights' },
  ] },
  { titulo: 'Recursos', itens: [{ label: 'Biblioteca', icon: Image, url: '/media-library' }] },
  { titulo: 'Conta', itens: [
    { label: 'Segurança da conta', icon: ShieldCheck, url: '/definicoes/seguranca' },
    { label: 'Preferências de IA', icon: Sparkles, url: '/ai-settings' },
    { label: 'Quotas', icon: Settings, url: '/quota' },
    { label: 'Utilizadores', icon: Users, url: '/users' },
  ] },
];

/** Which menu entry owns the current location (search-aware so Criar SM ≠ Aprovar). */
export function itemAtivo(pathname: string, search: string, url: string): boolean {
  const [p, q] = url.split('?');
  if (p === '/pending') {
    const criar = new URLSearchParams(search).get('tab') === 'create';
    return pathname === '/pending' && (q ? criar : !criar);
  }
  if (p === '/') return pathname === '/';
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function MenuNavegacao({ open, onOpenChange, gatilho }: { open: boolean; onOpenChange: (v: boolean) => void; gatilho: ReactNode }) {
  const { counts } = usePendingCounts();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const totalPending = counts.stories + counts.carousels + counts.posts;

  const sair = async () => { onOpenChange(false); await signOut(); navigate('/auth'); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{gatilho}</SheetTrigger>
      <SheetContent side="left" className="flex w-[min(20rem,88vw)] flex-col gap-0 overflow-y-auto bg-background p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">Hub de conteúdo</SheetTitle>
          <SheetDescription className="truncate text-xs">{user?.email ?? 'Menu principal'}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu principal" className="flex-1 space-y-4 px-3 py-4">
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
                    <button type="button" onClick={sair} className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-[15px] text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <LogOut className="h-5 w-5" aria-hidden />Sair
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
