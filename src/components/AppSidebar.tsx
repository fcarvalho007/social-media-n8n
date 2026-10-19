import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, LogOut, Plus, Settings, PanelsTopLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { useAuth } from '@/contexts/AuthContext';
import { DESTINOS_NAVEGACAO, SECOES_NAVEGACAO, itemNavegacaoAtivo } from '@/lib/navegacao';
import { toast } from 'sonner';

export function AppSidebar() {
  const { counts, error: erroContagem } = usePendingCounts();
  const { user, signOut } = useAuth();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const totalPending = counts.stories + counts.carousels + counts.posts;
  const [aSair, setASair] = useState(false);
  const conta = DESTINOS_NAVEGACAO.filter((d) => d.grupo === 'Conta');

  useEffect(() => { setOpenMobile(false); }, [pathname, search, setOpenMobile]);

  const sair = async () => {
    if (aSair) return;
    setASair(true);
    try { await signOut(); setOpenMobile(false); navigate('/auth'); }
    catch { toast.error('Não foi possível terminar a sessão. Tenta de novo.'); }
    finally { setASair(false); }
  };

  const ligacao = (url: string): JSX.Element => {
    const item = DESTINOS_NAVEGACAO.find((d) => d.url === url)!;
    const ativo = itemNavegacaoAtivo(pathname, search, item.url);
    return <SidebarMenuItem key={url}>
      <SidebarMenuButton asChild isActive={ativo} className="h-auto min-h-11 gap-3 rounded-md px-3 py-2 text-[13px] [&_svg]:stroke-[1.75] [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary">
        <Link to={item.url} aria-current={ativo ? 'page' : undefined} onClick={() => setOpenMobile(false)}>
          <item.icon aria-hidden />
          <span className="min-w-0 flex-1 leading-5">{item.label}</span>
          {item.badge && !erroContagem && totalPending > 0 && <span className="rounded-md bg-destructive px-1.5 text-xs font-semibold tabular-nums text-destructive-foreground" aria-label={`${totalPending} por aprovar`}>{totalPending}</span>}
          {item.badge && erroContagem && <span className="shrink-0 text-muted-foreground" title="Contagem indisponível. Abre a área para tentar novamente."><AlertCircle aria-hidden /><span className="sr-only">Contagem indisponível</span></span>}
        </Link>
      </SidebarMenuButton>
      {DESTINOS_NAVEGACAO.some(d => d.pai === item.url) && <SidebarMenu className="ml-5 mt-1 w-auto border-l pl-2" aria-label={`Dentro de ${item.label}`}>{DESTINOS_NAVEGACAO.filter(d => d.pai === item.url).map(d => ligacao(d.url))}</SidebarMenu>}
    </SidebarMenuItem>;
  };

  return <Sidebar collapsible="offcanvas" className="hub-navigation data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none" aria-label="Navegação do Hub">
    <SidebarHeader className="gap-3 border-b px-4 pb-4 pt-4">
      <Link to="/" onClick={() => setOpenMobile(false)} className="flex min-h-11 items-center rounded-md pr-11 text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mr-2.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><PanelsTopLeft className="size-4" aria-hidden /></span>Hub de conteúdo</Link>
      <Button asChild className="min-h-11 w-full justify-start gap-3">
        <Link to="/pending?tab=create" aria-current={itemNavegacaoAtivo(pathname, search, '/pending?tab=create') ? 'page' : undefined} onClick={() => setOpenMobile(false)}><Plus aria-hidden />Criar publicação social</Link>
      </Button>
    </SidebarHeader>
    <SidebarContent className="gap-3 py-3">
      <nav aria-label="Menu principal" className="flex flex-col gap-4 px-3">
        <SidebarMenu>{ligacao('/')}</SidebarMenu>
        {SECOES_NAVEGACAO.map((secao) => <SidebarGroup key={secao.titulo} className="p-0">
          <SidebarGroupLabel asChild className="mb-1 text-xs font-medium text-muted-foreground"><h2>{secao.titulo}</h2></SidebarGroupLabel>
          <SidebarMenu>{secao.urls.filter(url => {const d=DESTINOS_NAVEGACAO.find(d => d.url===url);return d&&!d.pai;}).map(ligacao)}</SidebarMenu>
        </SidebarGroup>)}
      </nav>
    </SidebarContent>
    <SidebarFooter className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="min-h-14 w-full justify-start gap-3 px-3" aria-label="Definições e conta">
            <Settings className="shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 text-left"><span className="block">Definições e conta</span><span className="block truncate text-xs font-normal text-muted-foreground">{user?.email ?? 'A tua conta'}</span></span>
            <ChevronDown className="shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64 max-h-[80dvh] overflow-y-auto">
          <DropdownMenuLabel>Definições e conta</DropdownMenuLabel><DropdownMenuSeparator />
          {conta.map((item) => <DropdownMenuItem key={item.url} asChild className="min-h-11"><Link to={item.url} onClick={() => setOpenMobile(false)}><item.icon aria-hidden />{item.label}</Link></DropdownMenuItem>)}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={aSair} onSelect={(e) => { e.preventDefault(); void sair(); }} className="min-h-11"><LogOut aria-hidden />{aSair ? 'A sair…' : 'Sair'}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  </Sidebar>;
}
