import { useRef, useState } from 'react';
import { Menu, PanelLeftClose, Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuotaBadge } from '@/components/QuotaBadge';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';
import { DESTINOS_NAVEGACAO, migalhasNavegacao } from '@/lib/navegacao';
import { BreadcrumbsHub } from '@/components/BreadcrumbsHub';

export function DashboardHeader() {
  const { toggleSidebar, open, openMobile, triggerRef } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const pesquisaRef = useRef<HTMLButtonElement>(null);
  const { pathname, search } = useLocation();
  const isMobile = useIsMobile();
  const migalhas = migalhasNavegacao(pathname, search);
  const mostraQuotas = /^\/(manual-create|calendar|drafts|pending|quota)/.test(pathname);
  const definicoes = DESTINOS_NAVEGACAO.filter((d) => d.grupo === 'Conta');

  return (
    <header className="hub-header sticky top-0 z-30 min-w-0 border-b bg-card">
      <div className="flex min-h-16 w-full min-w-0 items-center justify-between gap-2 px-4 md:px-6 xl:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button ref={triggerRef} variant="ghost" size="icon" onClick={toggleSidebar} className="size-11 shrink-0" aria-expanded={isMobile ? openMobile : open} aria-label={isMobile ? 'Abrir menu principal' : open ? 'Ocultar navegação' : 'Mostrar navegação'}>{!isMobile && open ? <PanelLeftClose aria-hidden /> : <Menu aria-hidden />}</Button>
          {isMobile ? <Link to="/" className="min-w-0 truncate py-3 text-sm font-semibold">Hub de conteúdo</Link> : <BreadcrumbsHub migalhas={migalhas} />}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button ref={pesquisaRef} variant="outline" onClick={() => setSearchOpen(true)} className="min-h-11 min-w-11 gap-3 border-transparent bg-background px-3 text-muted-foreground shadow-none" aria-label="Pesquisar no Hub (Ctrl ou Cmd+K)"><Search aria-hidden="true" /><span className="hidden lg:inline">Pesquisar no Hub</span><kbd className="hidden rounded border px-1.5 py-0.5 text-xs text-muted-foreground xl:inline">⌘ / Ctrl K</kbd></Button>
          <NotificationBell />
          {mostraQuotas && <><div className="hidden sm:block"><QuotaBadge /></div><div className="hidden lg:block"><AICreditsBadge /></div></>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Definições"><Settings aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Definições</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {definicoes.map((d) => <DropdownMenuItem key={d.url} asChild className="min-h-11"><Link to={d.url}><d.icon aria-hidden="true" />{d.label}</Link></DropdownMenuItem>)}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isMobile && <div className="border-t px-4"><BreadcrumbsHub compacto migalhas={migalhas} /></div>}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} gatilhoRef={pesquisaRef} />
    </header>
  );
}
