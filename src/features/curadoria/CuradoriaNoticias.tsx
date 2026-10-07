import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { decidirCuradoria, selecionarNaEdicao, lerFonteCuradoria, listarCuradoria, type DecisaoEditorial, type FonteCuradoria } from "@/services/curadoria";
import type { NoticiaCurada } from "@/services/curadoria";

export function nomeFonteCuradoria(n: Pick<NoticiaCurada, "fonte_nome" | "url">) {
  if (n.fonte_nome) return n.fonte_nome;
  try { const u = new URL(n.url ?? ""); if (/^https?:$/.test(u.protocol)) return u.hostname.replace(/^www\./, ""); } catch { /* historical records may have no URL */ }
  return "Não identificada no registo original";
}
export function canalCuradoria(n: Pick<NoticiaCurada, "fonte_tipo" | "origem">) {
  const nomes: Record<string,string> = { rss: "Feed RSS", html: "Página web", newsletter: "Newsletter por email", directorio_ferramentas: "Diretório de ferramentas", curadoria_ia: "Recolha de fontes", email_newsletter: "Newsletter por email", manual: "Inserção manual", manual_ia: "Texto inserido com IA", form_unica: "Formulário", form_bloco: "Formulário em bloco", whatsapp: "WhatsApp" };
  return nomes[n.fonte_tipo ?? ""] ?? nomes[n.origem] ?? "Origem não identificada";
}

export const API_CURADORIA = { listar: listarCuradoria, ler: lerFonteCuradoria, decidir: decidirCuradoria, selecionarEdicao: selecionarNaEdicao };
interface Props { api?: typeof API_CURADORIA; selecionar?: (f: FonteCuradoria) => void; noticiaInicial?: string; paraEdicao?: { id: string; onSelecionada: () => void }; }
const ESTADOS: Array<{ id: DecisaoEditorial; nome: string }> = [{ id: "pendente", nome: "Por rever" }, { id: "aprovada", nome: "Aprovadas" }, { id: "rejeitada", nome: "Rejeitadas" }];
export function CuradoriaNoticias({ selecionar, noticiaInicial, paraEdicao, api = API_CURADORIA }: Props) {
  const [estado, setEstado] = useState<DecisaoEditorial>(selecionar || paraEdicao ? "aprovada" : "pendente");
  const [query, setQuery] = useState("");
  const [procura, setProcura] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [dias, setDias] = useState("7");
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState<{ total: number; itens: NoticiaCurada[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processandoLote, setProcessandoLote] = useState(false);
  const [erroEscolha, setErroEscolha] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => { setProcura(query); setPagina(0); }, 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    let vivo = true; setErro(null);
    api.listar({ estado, query: procura, categoria: categoria === "todas" ? "" : categoria, pagina, desde: dias === "todos" ? null : new Date(Date.now() - Number(dias) * 86400000).toISOString() })
      .then((r) => vivo && setDados(r)).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [api, estado, procura, categoria, dias, pagina, tentativa]);
  useEffect(() => { setSelecionados(new Set()); }, [estado, procura, categoria, dias, pagina]);
  useEffect(() => {
    if (!noticiaInicial || !selecionar) return;
    let vivo = true;
    api.ler(noticiaInicial).then((f) => vivo && selecionar(f)).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [noticiaInicial]); // callback deliberately takes the latest source, no paid generation
  const escolher = async (id: string) => {
    setErroEscolha(null);
    setOcupado(id);
    try { selecionar?.(await api.ler(id)); } catch (e) {
      const mensagem = (e as Error).message;
      setErroEscolha(mensagem);
      toast.error(mensagem);
    }
    finally { setOcupado(null); }
  };
  const decidir = async (id: string, decisao: DecisaoEditorial) => {
    setOcupado(id);
    try {
      await api.decidir(id, decisao);
      setDados((atual) => atual ? { ...atual, total: Math.max(0, atual.total - 1), itens: atual.itens.filter((item) => item.id !== id) } : atual);
      setSelecionados((atual) => { const seguinte = new Set(atual); seguinte.delete(id); return seguinte; });
      toast.success(decisao === "aprovada" ? "Disponível para todos os formatos" : "Movida para Rejeitadas");
    }
    catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
  };
  const rejeitarSelecionados = async () => {
    const ids = [...selecionados];
    if (!ids.length) return;
    setProcessandoLote(true);
    const resultados = await Promise.allSettled(ids.map((id) => api.decidir(id, "rejeitada")));
    const concluídos = ids.filter((_, indice) => resultados[indice].status === "fulfilled");
    const falhados = ids.filter((_, indice) => resultados[indice].status === "rejected");
    setDados((atual) => atual ? { ...atual, total: Math.max(0, atual.total - concluídos.length), itens: atual.itens.filter((item) => !concluídos.includes(item.id)) } : atual);
    setSelecionados(new Set(falhados));
    setProcessandoLote(false);
    if (concluídos.length) toast.success(`${concluídos.length} ${concluídos.length === 1 ? "notícia movida" : "notícias movidas"} para Rejeitadas`);
    if (falhados.length) toast.error(`${falhados.length} ${falhados.length === 1 ? "notícia não foi processada" : "notícias não foram processadas"}`);
  };
  const idsVisíveis = dados?.itens.map((item) => item.id) ?? [];
  const todasVisíveis = idsVisíveis.length > 0 && idsVisíveis.every((id) => selecionados.has(id));
  return <section className="flex min-w-0 flex-col gap-4" aria-label="Notícias da curadoria">
    {selecionar && <p className="text-sm text-muted-foreground">Escolhe uma notícia aprovada. Fica guardada uma cópia da fonte neste conteúdo; escolher não gera nem publica nada.</p>}
    {!selecionar && !paraEdicao && <ToggleGroup type="single" value={estado} onValueChange={(v) => { if (v) { setEstado(v as DecisaoEditorial); setPagina(0); } }} className="justify-start" aria-label="Decisão editorial">
      {ESTADOS.map((e) => <ToggleGroupItem className="min-h-11" key={e.id} value={e.id}>{e.nome}</ToggleGroupItem>)}
    </ToggleGroup>}
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className="min-w-48 flex-1"><Label htmlFor="curadoria-procura">Pesquisar notícias</Label><Input id="curadoria-procura" className="mt-1 min-h-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título ou tema" maxLength={200} /></div>
      <div><Label htmlFor="curadoria-periodo">Período</Label><Select value={dias} onValueChange={(v) => { setDias(v); setPagina(0); }}><SelectTrigger id="curadoria-periodo" className="mt-1 min-h-11 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="3">Últimos 3 dias</SelectItem><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem></SelectGroup></SelectContent></Select></div>
      <div><Label htmlFor="curadoria-categoria">Tema</Label><Select value={categoria} onValueChange={(v) => { setCategoria(v); setPagina(0); }}><SelectTrigger id="curadoria-categoria" className="mt-1 min-h-11 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[["todas","Todos os temas"],["ia","Inteligência artificial"],["google","Google"],["youtube","YouTube"],["meta","Meta"],["linkedin","LinkedIn"],["tiktok","TikTok"],["x","X"],["media","Media"]].map(([id,nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
      <Button variant="outline" className="min-h-11" onClick={() => setTentativa((n) => n + 1)}>Atualizar</Button>
    </div>
    {erro && <Alert variant="destructive"><AlertTitle>Não foi possível carregar a curadoria</AlertTitle><AlertDescription>{erro} <Button variant="outline" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Button></AlertDescription></Alert>}
    {erroEscolha && <Alert variant="destructive"><AlertTitle>Não foi possível usar esta notícia</AlertTitle><AlertDescription>{erroEscolha}</AlertDescription></Alert>}
    {!dados && !erro && <div role="status" aria-label="A carregar notícias"><Skeleton className="h-24 w-full" /></div>}
    {dados && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium" role="status">{dados.total} {dados.total === 1 ? "notícia" : "notícias"} · página {pagina + 1}</p>
        {estado === "pendente" && dados.itens.length > 0 && <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground"><Checkbox aria-label="Selecionar notícias visíveis" checked={todasVisíveis} onCheckedChange={(checked) => setSelecionados(checked ? new Set(idsVisíveis) : new Set())} />Selecionar visíveis</label>}
      </div>
      {dados.total === 0 && <div className="flex flex-col gap-2 rounded-lg border p-5"><p className="font-medium">{selecionar ? "Ainda não há notícias aprovadas neste filtro" : "Não há notícias neste filtro"}</p><p className="text-sm text-muted-foreground">Muda o período ou a pesquisa.{selecionar && <> Podes aprovar notícias na <Link className="underline" to="/curadoria">Curadoria</Link>.</>}</p></div>}
      <ul className="grid items-stretch gap-3 lg:grid-cols-2">
        {dados.itens.map((n) => <li key={n.id} className="flex min-w-0 gap-3 rounded-lg border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-md">
          {estado === "pendente" && !selecionar && !paraEdicao && <Checkbox className="mt-1 h-5 w-5" aria-label={`Selecionar ${n.titulo}`} checked={selecionados.has(n.id)} onCheckedChange={(checked) => setSelecionados((atual) => { const seguinte = new Set(atual); checked ? seguinte.add(n.id) : seguinte.delete(n.id); return seguinte; })} />}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">{n.categoria} · {canalCuradoria(n)}</span><time dateTime={n.criado_em}>{new Date(n.criado_em).toLocaleDateString("pt-PT")}</time><span>{n.nivel === "artigo" ? "Artigo disponível" : "Só título/resumo disponível"}</span>{n.usos > 0 && <span>Reutilizada em {n.usos} {n.usos === 1 ? "conteúdo" : "conteúdos"}</span>}{n.estado_newsletter === "enviada" && <span>Já enviada na newsletter</span>}</div>
          <h2 className="break-words text-base font-semibold leading-snug">{n.titulo}</h2>
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Fonte: </span>{nomeFonteCuradoria(n)}</p>
          {n.descricao && <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">{n.descricao}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {n.url && /^https?:\/\//i.test(n.url) && <Button variant="link" asChild className="min-h-11 px-0"><a href={n.url} target="_blank" rel="noopener noreferrer">Ler fonte ↗</a></Button>}
            {selecionar ? <Button className="min-h-11" disabled={!!ocupado} onClick={() => escolher(n.id)}>{ocupado === n.id ? "A selecionar…" : "Usar notícia"}</Button> : paraEdicao ? <Button className="min-h-11" disabled={!!ocupado || n.edicoes?.includes(paraEdicao.id)} onClick={async () => {
              setOcupado(n.id); try { await api.selecionarEdicao(n.id, paraEdicao.id); paraEdicao.onSelecionada(); setTentativa((x) => x + 1); toast.success("Notícia escolhida para a edição"); } catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
            }}>{n.edicoes?.includes(paraEdicao.id) ? "Já nesta edição" : "Usar nesta edição"}</Button> : <>
              {estado !== "aprovada" && <Button className="min-h-11" disabled={!!ocupado} onClick={() => decidir(n.id, "aprovada")}>Aprovar</Button>}
              {estado !== "rejeitada" && <Button variant="outline" className="min-h-11" disabled={!!ocupado} onClick={() => decidir(n.id, "rejeitada")}>Rejeitar</Button>}
              {estado === "aprovada" && <Button variant="outline" className="min-h-11" asChild><Link to={`/estudio/roteiros/novo?noticia=${n.id}`}>Criar roteiro</Link></Button>}
              {estado === "aprovada" && ["carrossel", "post", "story"].map((f) => <Button key={f} variant="outline" className="min-h-11" asChild><Link to={`/estudio/carrosseis/novo?formato=${f}&noticia=${n.id}`}>Criar {f}</Link></Button>)}
            </>}
          </div></div>
        </li>)}
      </ul>
      <nav className="flex items-center justify-between gap-3" aria-label="Páginas da curadoria"><Button variant="outline" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button><Button variant="outline" disabled={(pagina + 1) * 24 >= dados.total} onClick={() => setPagina((p) => p + 1)}>Seguinte</Button></nav>
    </>}
    {estado === "pendente" && selecionados.size > 0 && <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border bg-foreground p-3 text-background shadow-xl" role="region" aria-label="Ações para notícias selecionadas">
      <p className="text-sm font-medium">{selecionados.size} {selecionados.size === 1 ? "notícia selecionada" : "notícias selecionadas"}</p>
      <div className="flex items-center gap-2"><Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" disabled={processandoLote} onClick={() => setSelecionados(new Set())}>Cancelar</Button><Button variant="destructive" disabled={processandoLote} onClick={rejeitarSelecionados}>{processandoLote ? "A rejeitar…" : "Rejeitar selecionadas"}</Button></div>
    </div>}
  </section>;
}
