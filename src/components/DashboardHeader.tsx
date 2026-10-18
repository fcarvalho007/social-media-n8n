import { useState } from 'react';
import { ChevronRight, Menu, Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MenuNavegacao } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuotaBadge } from '@/components/QuotaBadge';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';
import { DESTINOS_NAVEGACAO, migalhasNavegacao } from '@/lib/navegacao';

export function DashboardHeader() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname, search } = useLocation();
  const isMobile = useIsMobile();
  const migalhas = migalhasNavegacao(pathname, search);
  const visiveis = isMobile ? migalhas.slice(-1) : migalhas;
  const mostraQuotas = /^\/(manual-create|calendar|drafts|pending|quota)/.test(pathname);
  const definicoes = DESTINOS_NAVEGACAO.filter((d) => d.grupo === 'Conta');

  return (
    <header className="sticky top-0 z-30 min-w-0 border-b bg-card">
      <div className="flex min-h-16 w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6 xl:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MenuNavegacao open={menuAberto} onOpenChange={setMenuAberto} gatilho={
            <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Abrir menu principal"><Menu aria-hidden="true" /></Button>
          } />
          <nav aria-label="Localização atual" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              {visiveis.map((m, i) => (
                <li key={`${m.label}-${i}`} className="flex min-w-0 items-center gap-2">
                  {i > 0 && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  {m.path ? <Link to={m.path} className="inline-flex min-h-11 items-center whitespace-nowrap text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{m.label}</Link>
                    : <span aria-current="page" className="truncate font-semibold" title={m.label}>{m.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="size-11" aria-label="Pesquisar no Hub (Ctrl ou Cmd+K)"><Search aria-hidden="true" /></Button>
          <NotificationBell />
          {mostraQuotas && <><div className="hidden sm:block"><QuotaBadge /></div><div className="hidden lg:block"><AICreditsBadge /></div></>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Definições"><Settings aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Definições</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {definicoes.map((d) => <DropdownMenuItem key={d.url} asChild><Link to={d.url}><d.icon aria-hidden="true" />{d.label}</Link></DropdownMenuItem>)}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
