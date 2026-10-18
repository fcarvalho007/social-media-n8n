import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjeto } from '@/contexts/ProjetoContext';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { ProjetoPesquisa } from '@/features/percurso/ProjetoPesquisa';
import { useSeo } from '@/features/seo/api';
import { NavegacaoArtigos } from '@/features/seo/ComponentesSeo';
import { AssistenteSite } from '@/features/seo/AssistenteSite';
import { estadoConfiguracaoSite, ritmoDoSite } from '@/features/seo/configuracaoSite';
import type { EstadoPublicoSeo, SiteEditorial } from '@/features/seo/contratos';
export default function ConfigurarSite() {
  const ctx = useProjeto(), q = useSeo(), client = useQueryClient(), { siteId } = useParams();
  const e = q.data, site = e?.sites.find(s => s.id === siteId), podeEditar = e?.podeEditar !== false;
  async function guardada(s: SiteEditorial) {
    const key = BACKEND_NUVEM ? ['seo-nuvem-estado', ctx.projetoId] : ['seo-local-estado'];
    client.setQueryData<EstadoPublicoSeo>(key, atual => atual ? { ...atual, sites: atual.sites.map(p => p.id === s.id && p.politica.revista <= s.politica.revista ? { ...s, conhecimento: (p.conhecimento?.revista ?? 0) > (s.conhecimento?.revista ?? 0) ? p.conhecimento : s.conhecimento } : p) } : atual);
    await q.atualizar();
  }
  return <div className="hub-page">
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0">{siteId && <Button variant="link" className="mb-2 min-h-11 px-0" asChild><Link to="/artigos/sites"><ArrowLeft className="size-4" aria-hidden />Voltar aos sites</Link></Button>}<h1 className="break-words text-3xl font-semibold tracking-tight">{site ? `Configurar ${site.nome}` : 'Sites e regras'}</h1><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{site ? `${site.dominio} · ${ctx.projeto?.name ?? 'projeto atual'}` : 'Define o público, a voz e as regras editoriais de cada site.'}</p></div>{!siteId && <ProjetoPesquisa />}</header>
    {!siteId && <><details className="sm:hidden"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary underline underline-offset-4">Navegar em Artigos</summary><NavegacaoArtigos /></details><div className="hidden sm:block"><NavegacaoArtigos /></div></>}
    {!ctx.projetoId ? <section className="max-w-prose py-8"><h2 className="text-xl font-semibold">Escolhe um projeto de trabalho</h2><p className="mt-2 text-sm text-muted-foreground">As definições editoriais ficam guardadas no contexto desse projeto.</p>{siteId && <div className="mt-5"><ProjetoPesquisa /></div>}</section> : q.isLoading ? <div aria-label="A carregar os sites" role="status" className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div> : !e ? <Alert variant="destructive"><AlertTitle>Não foi possível abrir as definições</AlertTitle><AlertDescription><p>{q.error instanceof Error ? q.error.message : 'O motor editorial não respondeu.'}</p><Button className="mt-3 min-h-11" variant="outline" onClick={() => void q.refetch()}>Tentar novamente</Button></AlertDescription></Alert> : <>
      {q.error && <Alert variant="destructive"><AlertTitle>Não foi possível atualizar as definições</AlertTitle><AlertDescription>Mostramos a última leitura disponível. Confirma o estado mais recente antes de guardar. <Button className="min-h-11" variant="link" onClick={() => void q.refetch()}>Tentar novamente</Button></AlertDescription></Alert>}
      {!BACKEND_NUVEM && <p className="text-xs text-muted-foreground">{siteId ? 'Pré-visualização local · configurações do motor neste computador. A gravação não publica artigos nem ativa serviços pagos.' : 'Configurações locais · guardar não publica artigos nem ativa serviços pagos.'}</p>}
      {siteId ? site ? <AssistenteSite key={`${ctx.projetoId}:${site.id}`} site={site} projetoId={ctx.projetoId} podeEditar={podeEditar} aoGuardar={guardada} /> : <Alert><AlertTitle>Site não encontrado neste projeto</AlertTitle><AlertDescription><Button className="mt-2 min-h-11" variant="outline" asChild><Link to="/artigos/sites">Consultar sites disponíveis</Link></Button></AlertDescription></Alert> : <>
        <ListaSites titulo="Sites prioritários" descricao="Começa pelos destinos que já têm um papel editorial definido." sites={e.sites.filter(s => s.estado === 'piloto')} podeEditar={podeEditar} />
        <ListaSites titulo="A desenvolver mais tarde" descricao="Podes preparar a estratégia destes sites. A automação continua bloqueada enquanto estiverem planeados." sites={e.sites.filter(s => s.estado === 'planeado')} podeEditar={podeEditar} />
        <div className="flex max-w-prose items-start gap-3 border-t pt-5"><SlidersHorizontal className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden /><div><p className="text-sm text-muted-foreground">A configuração editorial prepara as regras. Ativação, orçamento, fontes da marca e ligação WordPress têm verificações próprias.</p><Button className="mt-2 min-h-11 px-0" variant="link" asChild><Link to="/artigos/automacao">Abrir automação e limites<ArrowRight className="size-4" aria-hidden /></Link></Button></div></div>
      </>}
    </>}
  </div>;
}
function ListaSites({ titulo, descricao, sites, podeEditar }: { titulo: string; descricao: string; sites: SiteEditorial[]; podeEditar: boolean }) {
  if (!sites.length) return null;
  return <section className="flex min-w-0 flex-col gap-4"><div><h2 className="text-xl font-semibold">{titulo}</h2><p className="mt-2 max-w-prose text-sm text-muted-foreground">{descricao}</p></div><ul className="divide-y rounded-xl border bg-card">{sites.map(s => <li key={s.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div className="min-w-0 flex-1 basis-64"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.nome}</h3><Badge variant="secondary">{estadoConfiguracaoSite(s)}</Badge></div><p className="mt-1 break-all text-sm text-primary">{s.dominio}</p><p className="mt-2 max-w-prose text-sm text-muted-foreground">{s.estado === 'planeado' ? 'Planeado · a desenvolver mais tarde' : s.publico}</p>{s.configuracaoGuiada && <p className="mt-2 text-xs text-muted-foreground">{ritmoDoSite(s.politica)} · {s.revisaoObrigatoria || s.politica.publicacao === 'humana' ? 'Aprovação humana' : 'Publicação sujeita aos controlos'}</p>}</div><Button variant="outline" className="min-h-11" aria-label={`${podeEditar ? 'Configurar' : 'Consultar'} ${s.dominio}`} asChild><Link to={`/artigos/sites/${encodeURIComponent(s.id)}`}>{podeEditar ? s.configuracaoGuiada ? 'Rever definições' : 'Configurar' : 'Consultar'}<ArrowRight className="size-4" aria-hidden /></Link></Button></li>)}</ul></section>;
}
