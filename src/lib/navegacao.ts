import {
  BarChart3, Bell, Calendar, CheckCircle2, Euro, FileText, FolderKanban,
  GalleryHorizontal, History, Image, KeyRound, LayoutDashboard, Lightbulb,
  Mail, Search, Route, PlusCircle, Settings, SlidersHorizontal, ShieldCheck, Sparkles, Users, Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SEO_DISPONIVEL } from '@/features/seo/local';
import { DOCUMENTOS_DISPONIVEL } from '@/features/documentos/modelo';

export interface DestinoNavegacao {
  label: string;
  url: string;
  descricao: string;
  grupo: 'Trabalho' | 'Publicação' | 'Análise' | 'Conta';
  icon: LucideIcon;
  badge?: boolean;
  pai?: string;
  palavrasChave?: string[];
}

/** One vocabulary for navigation, search, page titles and breadcrumbs. */
export const DESTINOS_NAVEGACAO: DestinoNavegacao[] = [
  { label: 'Início', url: '/', descricao: 'Retomar trabalho e escolher projeto', grupo: 'Trabalho', icon: LayoutDashboard },
  { label: 'Pesquisar no Hub', url: '/pesquisa', descricao: 'Pesquisar texto em PDFs, notícias, artigos e peças sociais', grupo: 'Trabalho', icon: Search, palavrasChave: ['pesquisa transversal','encontrar','busca'] },
  ...(SEO_DISPONIVEL ? [{ label: 'Percurso editorial', url: '/artigos/percurso', pai: '/artigos', descricao: 'Fonte, pesquisa, artigo, aprovação, publicação e resultados', grupo: 'Trabalho' as const, icon: Route }] : []),
  ...(SEO_DISPONIVEL ? [{ label: 'Sites e regras', url: '/artigos/sites', pai: '/artigos', descricao: 'Configuração guiada de público, voz, temas, oferta, frequência e aprovação', grupo: 'Trabalho' as const, icon: SlidersHorizontal, palavrasChave: ['configurar site','assistente','público','voz','temas','oferta','frequência','aprovação'] }] : []),
  { label: 'Curadoria', url: '/curadoria', descricao: 'Escolher notícias, emails e documentos para criar conteúdo', grupo: 'Trabalho', icon: CheckCircle2 },
  ...(SEO_DISPONIVEL ? [{label:'Campanhas',url:'/campanhas',descricao:'Criar artigo, newsletter, carrossel, Story e continuidade a partir de uma descoberta',grupo:'Trabalho' as const,icon:Route,palavrasChave:['campanha','descoberta','sequência','multicanal']}] : []),
  { label: 'Criar publicação social', url: '/pending?tab=create', descricao: 'Redes sociais: criação manual ou com IA', grupo: 'Trabalho', icon: PlusCircle },
  { label: 'Conteúdos visuais', url: '/estudio/carrosseis', descricao: 'Carrosséis, posts e stories', grupo: 'Trabalho', icon: GalleryHorizontal },
  { label: 'Roteiros de Reels', url: '/estudio/roteiros', descricao: 'Escrever e preparar a gravação', grupo: 'Trabalho', icon: Video },
  { label: 'Newsletter', url: '/newsletter', descricao: 'Edições, crónica e envio', grupo: 'Trabalho', icon: Mail },
  { label: 'Artigos', url: '/artigos', descricao: SEO_DISPONIVEL ? 'Pesquisa SEO, plano editorial e textos' : 'Escrever e guardar rascunhos', grupo: 'Trabalho', icon: FileText },
  ...(DOCUMENTOS_DISPONIVEL ? [{ label: 'Documentos e relatórios', url: '/curadoria/documentos', pai: '/curadoria', palavrasChave: ['PDF Tracker', 'PDFs', 'acervo'], descricao: 'Biblioteca de PDFs, capas e páginas de referência', grupo: 'Trabalho' as const, icon: FileText }] : []),
  { label: 'Rascunhos', url: '/drafts', descricao: 'Publicações sociais por concluir', grupo: 'Publicação', icon: FileText },
  { label: 'Divulgação da newsletter', url: '/estudio/redes-sociais', pai: '/newsletter', descricao: 'Story e carrossel após o envio', grupo: 'Publicação', icon: GalleryHorizontal },
  { label: 'Para aprovar', url: '/pending', descricao: 'Rever publicações das redes sociais', grupo: 'Publicação', icon: CheckCircle2, badge: true },
  { label: 'Calendário', url: '/calendar', descricao: 'Publicações agendadas', grupo: 'Publicação', icon: Calendar },
  { label: 'Histórico de publicações', url: '/publication-history', descricao: 'Consultar resultados e falhas', grupo: 'Publicação', icon: History },
  { label: 'Imagens e ficheiros', palavrasChave: ['Biblioteca', 'Média', 'Media'], url: '/media-library', descricao: 'Imagens, vídeos e ficheiros', grupo: 'Trabalho', icon: Image },
  { label: 'Projetos', url: '/projects', descricao: 'Marcas, tarefas e equipa', grupo: 'Trabalho', icon: FolderKanban },
  { label: 'Resultados', palavrasChave: ['Analytics', 'Estatísticas'], url: '/analytics', descricao: 'Resultados das redes sociais', grupo: 'Análise', icon: BarChart3 },
  { label: 'Sugestões', palavrasChave: ['Insights'], url: '/insights', descricao: 'Sugestões a partir dos resultados', grupo: 'Análise', icon: Lightbulb },
  { label: 'Comparar contas', palavrasChave: ['Benchmark'], url: '/benchmark', descricao: 'Comparar desempenho', grupo: 'Análise', icon: BarChart3 },
  { label: 'Custos', url: '/custos', descricao: 'Consumo real de IA e serviços', grupo: 'Análise', icon: Euro },
  { label: 'Ligações', url: '/estudio/ligacoes', descricao: 'Estado das integrações', grupo: 'Conta', icon: KeyRound },
  { label: 'Preferências de IA', url: '/ai-settings', descricao: 'Idioma, tom e sugestões', grupo: 'Conta', icon: Sparkles },
  { label: 'Quotas', url: '/quota', descricao: 'Limites de publicação', grupo: 'Conta', icon: Settings },
  { label: 'Notificações', url: '/settings/notifications', descricao: 'Lembretes de publicação', grupo: 'Conta', icon: Bell },
  { label: 'Segurança da conta', url: '/definicoes/seguranca', descricao: 'Consultar a sessão e a conta', grupo: 'Conta', icon: ShieldCheck },
  { label: 'Utilizadores', url: '/users', descricao: 'Consultar a equipa', grupo: 'Conta', icon: Users },
];

/** Main tasks remain visible; account options live together in the footer. */
export const SECOES_NAVEGACAO = [
  { titulo: 'Recolher conteúdo', urls: ['/pesquisa', '/curadoria', ...(DOCUMENTOS_DISPONIVEL ? ['/curadoria/documentos'] : [])] },
  { titulo: 'Criar conteúdo', urls: [...(SEO_DISPONIVEL ? ['/campanhas'] : []), '/newsletter', '/estudio/redes-sociais', '/artigos', ...(SEO_DISPONIVEL ? ['/artigos/percurso','/artigos/sites'] : []), '/estudio/carrosseis', '/estudio/roteiros'] },
  { titulo: 'Rever e publicar nas redes', urls: ['/drafts', '/pending', '/calendar', '/publication-history'] },
  { titulo: 'Organizar', urls: ['/projects', '/media-library'] },
  { titulo: 'Resultados e custos', urls: ['/analytics', '/insights', '/benchmark', '/custos'] },
];

const ALIASES: Record<string, string> = {
  '/quota-settings': '/quota', '/failed-publications': '/publication-history',
  '/dashboard': '/', '/redes-sociais': '/', '/documentos': '/curadoria/documentos',
};
const caminhoAtual = (pathname: string) => ALIASES[pathname] ?? pathname;

export function itemNavegacaoAtivo(pathname: string, search: string, url: string): boolean {
  if (pathname === '/manual-create') return url === '/pending?tab=create';
  if (pathname === '/review' || pathname.startsWith('/review/')) return url === '/pending';
  const atual = caminhoAtual(pathname);
  if (atual === '/pending') return url === (new URLSearchParams(search).get('tab') === 'create' ? '/pending?tab=create' : '/pending');
  // The most specific destination owns the page. A child must not select its parent too.
  const destino = DESTINOS_NAVEGACAO.filter(d => !d.url.includes('?')).filter(d =>
    atual === d.url || (d.url !== '/' && atual.startsWith(`${d.url}/`)),
  ).sort((a,b) => b.url.length - a.url.length)[0];
  return destino?.url === url;
}

export interface Migalha { label: string; path: string | null }
export function migalhasNavegacao(pathname: string, search = ''): Migalha[] {
  const inicio: Migalha = { label: 'Início', path: '/' };
  const params = new URLSearchParams(search);
  const lista = (url: string) => DESTINOS_NAVEGACAO.find(d => d.url === url);
  const caminho = (url: string): Migalha[] => {
    const d = lista(url);
    return d ? [...(d.pai ? caminho(d.pai) : [inicio]), {label:d.label,path:d.url}] : [inicio];
  };
  const detalhe = (url: string, label: string): Migalha[] => [...caminho(url), {label,path:null}];
  const atual = caminhoAtual(pathname);
  if (atual === '/') return [{...inicio,path:null}];
  if (atual === '/curadoria/documentos' && DOCUMENTOS_DISPONIVEL) {
    const separador = params.get('separador');
    const nomes: Record<string,string> = {fontes:'Sites com PDFs',recolher:'Adicionar por endereço',historico:'Histórico de recolhas'};
    const label = nomes[separador ?? ''] ?? (params.has('documento') ? 'Ler documento' : null);
    if (label) {
      const volta = new URLSearchParams(params);
      volta.delete('documento'); volta.delete('separador');
      const migalhas = caminho('/curadoria/documentos');
      migalhas[migalhas.length-1].path = `/curadoria/documentos${volta.size ? `?${volta}` : ''}`;
      return [...migalhas,{label,path:null}];
    }
  }
  if (atual === '/curadoria' && ['emails','fontes'].includes(params.get('separador') ?? '')) return detalhe('/curadoria',params.get('separador') === 'emails' ? 'Emails' : 'Fontes de notícias');
  if (pathname === '/manual-create') return detalhe('/pending?tab=create', 'Publicação manual');
  if (pathname === '/estudio/carrosseis/novo') return detalhe('/estudio/carrosseis', 'Criar conteúdo visual');
  if (pathname.startsWith('/estudio/carrosseis/')) return detalhe('/estudio/carrosseis', 'Compositor');
  if (pathname.startsWith('/estudio/redes-sociais/')) return detalhe('/estudio/redes-sociais', 'Compositor');
  if (pathname.startsWith('/estudio/roteiros/')) return detalhe('/estudio/roteiros', pathname.endsWith('/novo') ? 'Novo roteiro' : 'Editor');
  if(pathname.startsWith('/campanhas/')) return detalhe('/campanhas',pathname.endsWith('/nova')?'Nova campanha':pathname.includes('/compositor/')?'Compositor':'Detalhe da campanha');
  if (pathname.startsWith('/artigos/')) {
    const nomes: Record<string,string> = {sites:'Sites e regras',percurso:'Percurso editorial',pesquisa:'Pesquisa SEO',plano:'Plano editorial',automacao:'Automação',custos:'Custos de pesquisa'};
    const migalhas = detalhe('/artigos',nomes[pathname.split('/')[2]] ?? 'Artigo');
    const secoes: Record<string,string> = {conhecimento:'Conhecimento da marca',limites:'Serviços e limites',ciclos:'Ciclos de produção'};
    const label = pathname === '/artigos/plano' && params.has('id') ? (params.get('secao') === 'texto' ? 'Rever artigo' : 'Preparar artigo') : pathname === '/artigos/automacao' ? secoes[params.get('secao') ?? ''] : null;
    if (pathname.startsWith('/artigos/sites/')) { migalhas[migalhas.length-1].path = '/artigos/sites'; migalhas.push({label:'Configuração guiada',path:null}); }
    if (label) { migalhas[migalhas.length-1].path = pathname; migalhas.push({label,path:null}); }
    return migalhas;
  }
  if (pathname === '/artigos' && params.has('id')) return detalhe('/artigos','Editor de texto');
  if (pathname === '/templates') return detalhe('/projects','Modelos de projeto');
  if (pathname.startsWith('/projects/')) return detalhe('/projects', 'Detalhes');
  if (pathname === '/review' || pathname.startsWith('/review/')) return detalhe('/pending', 'Revisão');
  if (pathname.startsWith('/newsletter/')) {
    const paginas: Record<string,string> = {arquivo:'Arquivo',definicoes:'Definições',fontes:'Fontes',ferramentas:'Ferramentas',migracao:'Migração'};
    return detalhe('/newsletter',paginas[pathname.split('/')[2]] ?? 'Edição');
  }
  const destino = DESTINOS_NAVEGACAO.find(d => itemNavegacaoAtivo(atual,search,d.url));
  if (destino) { const migalhas = caminho(destino.url); migalhas[migalhas.length-1].path = null; return migalhas; }
  return [inicio,{label:'Página',path:null}];
}
