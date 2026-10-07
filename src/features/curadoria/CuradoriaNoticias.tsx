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
  const [dias, setDias] = useState("todos");
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState<{ total: number; itens: NoticiaCurada[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erroEscolha, setErroEscolha] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => { setProcura(query); setPagina(0); }, 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    let vivo = true; setDados(null); setErro(null);
    api.listar({ estado, query: procura, categoria: categoria === "todas" ? "" : categoria, pagina, desde: dias === "todos" ? null : new Date(Date.now() - Number(dias) * 86400000).toISOString() })
      .then((r) => vivo && setDados(r)).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [api, estado, procura, categoria, dias, pagina, tentativa]);
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
    try { await api.decidir(id, decisao); setTentativa((n) => n + 1); toast.success(decisao === "aprovada" ? "Disponível para todos os formatos" : "Decisão guardada"); }
    catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
  };
  return <section className="flex min-w-0 flex-col gap-4" aria-label="Notícias da curadoria">
    <p className="text-sm text-muted-foreground">{selecionar ? "Escolhe uma notícia aprovada. Fica guardada uma cópia da fonte neste conteúdo; escolher não gera nem publica nada." : "Aprova uma vez e reutiliza na newsletter, no carrossel, no post ou no story. A seleção para cada edição e a revisão de cada publicação continuam independentes."}</p>
    {!selecionar && !paraEdicao && <ToggleGroup type="single" value={estado} onValueChange={(v) => { if (v) { setEstado(v as DecisaoEditorial); setPagina(0); } }} className="justify-start" aria-label="Decisão editorial">
      {ESTADOS.map((e) => <ToggleGroupItem className="min-h-11" key={e.id} value={e.id}>{e.nome}</ToggleGroupItem>)}
    </ToggleGroup>}
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1"><Label htmlFor="curadoria-procura">Pesquisar notícias</Label><Input id="curadoria-procura" className="mt-1 min-h-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título ou tema" maxLength={200} /></div>
      <div><Label htmlFor="curadoria-periodo">Período</Label><Select value={dias} onValueChange={(v) => { setDias(v); setPagina(0); }}><SelectTrigger id="curadoria-periodo" className="mt-1 min-h-11 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todo o arquivo</SelectItem><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem></SelectGroup></SelectContent></Select></div>
      <div><Label htmlFor="curadoria-categoria">Tema</Label><Select value={categoria} onValueChange={(v) => { setCategoria(v); setPagina(0); }}><SelectTrigger id="curadoria-categoria" className="mt-1 min-h-11 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[["todas","Todos os temas"],["ia","Inteligência artificial"],["google","Google"],["youtube","YouTube"],["meta","Meta"],["linkedin","LinkedIn"],["tiktok","TikTok"],["x","X"],["media","Media"]].map(([id,nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
      <Button variant="outline" className="min-h-11" onClick={() => setTentativa((n) => n + 1)}>Atualizar</Button>
    </div>
    {erro && <Alert variant="destructive"><AlertTitle>Não foi possível carregar a curadoria</AlertTitle><AlertDescription>{erro} <Button variant="outline" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Button></AlertDescription></Alert>}
    {erroEscolha && <Alert variant="destructive"><AlertTitle>Não foi possível usar esta notícia</AlertTitle><AlertDescription>{erroEscolha}</AlertDescription></Alert>}
    {!dados && !erro && <div role="status" aria-label="A carregar notícias"><Skeleton className="h-24 w-full" /></div>}
    {dados && <>
      <p className="text-xs text-muted-foreground" role="status">{dados.total} notícias · página {pagina + 1}</p>
      {dados.total === 0 && <div className="flex flex-col gap-2 rounded-lg border p-5"><p className="font-medium">{selecionar ? "Ainda não há notícias aprovadas neste filtro" : "Não há notícias neste filtro"}</p><p className="text-sm text-muted-foreground">Muda o período ou a pesquisa.{selecionar && <> Podes aprovar notícias na <Link className="underline" to="/curadoria">Curadoria</Link>.</>}</p></div>}
      <ul className="grid gap-3">
        {dados.itens.map((n) => <li key={n.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{n.categoria} · {canalCuradoria(n)}</span><time dateTime={n.criado_em}>{new Date(n.criado_em).toLocaleDateString("pt-PT")}</time><span>{n.nivel === "artigo" ? "Artigo disponível" : "Só título/resumo disponível"}</span>{n.usos > 0 && <span>Reutilizada em {n.usos} {n.usos === 1 ? "conteúdo" : "conteúdos"}</span>}{n.estado_newsletter === "enviada" && <span>Já enviada na newsletter</span>}</div>
          <p className="text-sm"><span className="font-medium">Fonte: </span>{nomeFonteCuradoria(n)}</p>
          <h2 className="break-words text-base font-semibold">{n.titulo}</h2>
          {n.descricao && <p className="line-clamp-3 break-words text-sm text-muted-foreground">{n.descricao}</p>}
          <div className="flex flex-wrap gap-2">
            {n.url && /^https?:\/\//i.test(n.url) && <Button variant="link" asChild className="min-h-11 px-0"><a href={n.url} target="_blank" rel="noopener noreferrer">Ler fonte ↗</a></Button>}
            {selecionar ? <Button className="min-h-11" disabled={!!ocupado} onClick={() => escolher(n.id)}>{ocupado === n.id ? "A selecionar…" : "Usar notícia"}</Button> : paraEdicao ? <Button className="min-h-11" disabled={!!ocupado || n.edicoes?.includes(paraEdicao.id)} onClick={async () => {
              setOcupado(n.id); try { await api.selecionarEdicao(n.id, paraEdicao.id); paraEdicao.onSelecionada(); setTentativa((x) => x + 1); toast.success("Notícia escolhida para a edição"); } catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
            }}>{n.edicoes?.includes(paraEdicao.id) ? "Já nesta edição" : "Usar nesta edição"}</Button> : <>
              {estado !== "aprovada" && <Button className="min-h-11" disabled={!!ocupado} onClick={() => decidir(n.id, "aprovada")}>Aprovar</Button>}
              {estado !== "rejeitada" && <Button variant="outline" className="min-h-11" disabled={!!ocupado} onClick={() => decidir(n.id, "rejeitada")}>Rejeitar</Button>}
              {estado === "aprovada" && ["carrossel", "post", "story"].map((f) => <Button key={f} variant="outline" className="min-h-11" asChild><Link to={`/estudio/carrosseis/novo?formato=${f}&noticia=${n.id}`}>Criar {f}</Link></Button>)}
            </>}
          </div>
        </li>)}
      </ul>
      <nav className="flex items-center justify-between gap-3" aria-label="Páginas da curadoria"><Button variant="outline" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button><Button variant="outline" disabled={(pagina + 1) * 24 >= dados.total} onClick={() => setPagina((p) => p + 1)}>Seguinte</Button></nav>
    </>}
  </section>;
}
