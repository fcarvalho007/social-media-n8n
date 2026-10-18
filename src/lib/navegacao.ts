import {
  BarChart3, Bell, Calendar, CheckCircle2, Euro, FileText, FolderKanban,
  GalleryHorizontal, History, Image, KeyRound, LayoutDashboard, Lightbulb,
  Mail, PlusCircle, Settings, ShieldCheck, Sparkles, Users, Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DestinoNavegacao {
  label: string;
  url: string;
  descricao: string;
  grupo: 'Trabalho' | 'Publicação' | 'Análise' | 'Conta';
  icon: LucideIcon;
  badge?: boolean;
}

/** One vocabulary for the drawer, search, page titles and breadcrumbs. */
export const DESTINOS_NAVEGACAO: DestinoNavegacao[] = [
  { label: 'Painel', url: '/', descricao: 'Retomar trabalho e escolher projeto', grupo: 'Trabalho', icon: LayoutDashboard },
  { label: 'Curadoria', url: '/curadoria', descricao: 'Notícias, fontes e emails recebidos', grupo: 'Trabalho', icon: CheckCircle2 },
  { label: 'Criar SM', url: '/pending?tab=create', descricao: 'Criar publicação manual ou com IA', grupo: 'Trabalho', icon: PlusCircle },
  { label: 'Conteúdos visuais', url: '/estudio/carrosseis', descricao: 'Carrosséis, posts e stories', grupo: 'Trabalho', icon: GalleryHorizontal },
  { label: 'Roteiros de Reels', url: '/estudio/roteiros', descricao: 'Escrever e preparar a gravação', grupo: 'Trabalho', icon: Video },
  { label: 'Newsletter', url: '/newsletter', descricao: 'Edições, crónica e envio', grupo: 'Trabalho', icon: Mail },
  { label: 'Artigos', url: '/artigos', descricao: 'Escrever e guardar rascunhos', grupo: 'Trabalho', icon: FileText },
  { label: 'Rascunhos', url: '/drafts', descricao: 'Publicações sociais por concluir', grupo: 'Publicação', icon: FileText },
  { label: 'Divulgação da newsletter', url: '/estudio/redes-sociais', descricao: 'Story e carrossel após o envio', grupo: 'Publicação', icon: GalleryHorizontal },
  { label: 'Aprovar', url: '/pending', descricao: 'Rever publicações pendentes', grupo: 'Publicação', icon: CheckCircle2, badge: true },
  { label: 'Calendário', url: '/calendar', descricao: 'Publicações agendadas', grupo: 'Publicação', icon: Calendar },
  { label: 'Histórico de publicações', url: '/publication-history', descricao: 'Consultar resultados e falhas', grupo: 'Publicação', icon: History },
  { label: 'Biblioteca', url: '/media-library', descricao: 'Imagens, vídeos e ficheiros', grupo: 'Trabalho', icon: Image },
  { label: 'Projetos', url: '/projects', descricao: 'Marcas, tarefas e equipa', grupo: 'Trabalho', icon: FolderKanban },
  { label: 'Analytics', url: '/analytics', descricao: 'Resultados das redes sociais', grupo: 'Análise', icon: BarChart3 },
  { label: 'Insights', url: '/insights', descricao: 'Sugestões a partir dos resultados', grupo: 'Análise', icon: Lightbulb },
  { label: 'Benchmark', url: '/benchmark', descricao: 'Comparar desempenho', grupo: 'Análise', icon: BarChart3 },
  { label: 'Custos', url: '/custos', descricao: 'Consumo real de IA e serviços', grupo: 'Análise', icon: Euro },
  { label: 'Ligações', url: '/estudio/ligacoes', descricao: 'Estado das integrações', grupo: 'Conta', icon: KeyRound },
  { label: 'Preferências de IA', url: '/ai-settings', descricao: 'Idioma, tom e sugestões', grupo: 'Conta', icon: Sparkles },
  { label: 'Quotas', url: '/quota', descricao: 'Limites de publicação', grupo: 'Conta', icon: Settings },
  { label: 'Notificações', url: '/settings/notifications', descricao: 'Lembretes de publicação', grupo: 'Conta', icon: Bell },
  { label: 'Segurança da conta', url: '/definicoes/seguranca', descricao: 'Consultar a sessão e a conta', grupo: 'Conta', icon: ShieldCheck },
  { label: 'Utilizadores', url: '/users', descricao: 'Consultar a equipa', grupo: 'Conta', icon: Users },
];

export function itemNavegacaoAtivo(pathname: string, search: string, url: string): boolean {
  const [p, q] = url.split('?');
  if (p === '/pending') return pathname === p && ((new URLSearchParams(search).get('tab') === 'create') === !!q);
  return p === '/' ? pathname === p : pathname === p || pathname.startsWith(`${p}/`);
}

export interface Migalha { label: string; path: string | null }
export function migalhasNavegacao(pathname: string, search = ''): Migalha[] {
  const painel = { label: 'Painel', path: '/' };
  const lista = (url: string) => DESTINOS_NAVEGACAO.find((d) => d.url === url)!;
  const detalhe = (url: string, label: string): Migalha[] => [painel, { label: lista(url).label, path: url }, { label, path: null }];
  if (pathname === '/') return [{ ...painel, path: null }];
  if (pathname === '/manual-create') return detalhe('/pending?tab=create', 'Publicação manual');
  if (pathname === '/estudio/carrosseis/novo') return detalhe('/estudio/carrosseis', 'Criar conteúdo visual');
  if (pathname.startsWith('/estudio/carrosseis/')) return detalhe('/estudio/carrosseis', 'Compositor');
  if (pathname.startsWith('/estudio/redes-sociais/')) return detalhe('/estudio/redes-sociais', 'Compositor');
  if (pathname.startsWith('/estudio/roteiros/')) return detalhe('/estudio/roteiros', pathname.endsWith('/novo') ? 'Novo roteiro' : 'Editor');
  if (pathname.startsWith('/projects/')) return detalhe('/projects', 'Detalhes');
  if (pathname.startsWith('/review')) return detalhe('/pending', 'Revisão');
  if (pathname.startsWith('/newsletter/')) {
    const paginas: Record<string, string> = { arquivo: 'Arquivo', definicoes: 'Definições', fontes: 'Fontes', ferramentas: 'Ferramentas', migracao: 'Migração' };
    return detalhe('/newsletter', paginas[pathname.split('/')[2]] ?? 'Edição');
  }
  const aliases: Record<string, string> = { '/quota-settings': '/quota', '/failed-publications': '/publication-history', '/redes-sociais': '/', '/dashboard': '/' };
  const p = aliases[pathname] ?? pathname;
  const destino = DESTINOS_NAVEGACAO.find((d) => itemNavegacaoAtivo(p, search, d.url));
  if (destino) return [painel, { label: destino.label, path: null }];
  return [painel, { label: 'Página', path: null }];
}
