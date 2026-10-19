import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { SEO_DISPONIVEL } from '@/features/seo/local';
import { DOCUMENTOS_DISPONIVEL } from '@/features/documentos/modelo';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, FileText, GalleryHorizontal, KeyRound, Mail, PlusCircle, RefreshCw, Upload, Route, BookOpen, ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bloco, CalendarioBloco, ConteudoBloco, CustosBloco, ProjetosBloco } from "@/features/painel/PainelBento";
import { useProjeto } from "@/contexts/ProjetoContext";
import { associarIdentidade, resumoContinuidade, souAdminNewsletter, type Continuidade, type Identidade } from "@/services/estudio";

const SEM = "__sem__";
const dataPt = (s: string) => new Date(s).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });

interface Acao { titulo: string; desc: string; icon: typeof Mail; url: string }
const PRODUCAO: Acao[] = [
  { titulo: "Curadoria", desc: "Uma seleção para todos os formatos", icon: FileText, url: "/curadoria" },
  { titulo: "Publicação social", desc: "Manual ou assistido por IA", icon: PlusCircle, url: "/pending?tab=create" },
  { titulo: "Conteúdos visuais", desc: "Meus conteúdos e carrosséis da crónica", icon: GalleryHorizontal, url: "/estudio/carrosseis" },
  { titulo: "Roteiros de Reels", desc: "Preparar a leitura e retomar roteiros", icon: FileText, url: "/estudio/roteiros" },
  { titulo: "Newsletter", desc: "Edições, crónica e arquivo", icon: Mail, url: "/newsletter" },
  { titulo: "Artigos", desc: SEO_DISPONIVEL ? "Planear, escrever e rever por site" : "Escrever e guardar rascunhos", icon: FileText, url: "/artigos" },
];
if (SEO_DISPONIVEL) PRODUCAO.splice(1, 0, { titulo: "Campanhas", desc: "Uma descoberta, várias peças coordenadas", icon: Route, url: "/campanhas" });
if (DOCUMENTOS_DISPONIVEL) PRODUCAO.push({ titulo: "Documentos e relatórios", desc: "Pesquisar estudos e aproveitar páginas verificadas", icon: BookOpen, url: "/curadoria/documentos" });
const CONFIGURACAO: Acao[] = [
  { titulo: "Ligações", desc: "Estado das chaves e serviços externos", icon: KeyRound, url: "/estudio/ligacoes" },
  { titulo: "Migração", desc: "Importar os dados da newsletter original", icon: Upload, url: "/newsletter/migracao" },
];

export default function Estudio() {
  const ctx = useProjeto();
  const [admin, setAdmin] = useState(false);
  const [resumo, setResumo] = useState<{ estado: "a_carregar" | "pronto" | "erro"; dados?: Continuidade; erro?: string }>({ estado: "a_carregar" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => { souAdminNewsletter().then(setAdmin).catch(() => setAdmin(false)); }, []);

  const identIds = ctx.identidadesDoProjeto(ctx.projetoId).map((i) => i.id);
  const chaveIdent = identIds.join(",");
  useEffect(() => {
    if (ctx.estado !== "pronto") return;
    let vivo = true;
    setResumo({ estado: "a_carregar" });
    resumoContinuidade(ctx.projetoId, chaveIdent ? chaveIdent.split(",") : [])
      .then((d) => vivo && setResumo({ estado: "pronto", dados: d }))
      .catch((e: Error) => vivo && setResumo({ estado: "erro", erro: e.message }));
    return () => { vivo = false; };
  }, [ctx.estado, ctx.projetoId, chaveIdent, tentativa]);

  const escolher = async (v: string) => {
    try { await ctx.escolher(v === SEM ? null : v); }
    catch (e) { toast.error(`A escolha não foi guardada: ${(e as Error).message}`); }
  };
  const associar = async (ident: Identidade, v: string) => {
    try { await associarIdentidade(ident.id, v === SEM ? null : v); toast.success("Associação guardada"); ctx.recarregar(); }
    catch (e) { toast.error(`A associação não foi guardada: ${(e as Error).message}`); }
  };

  return (
    <div className="hub-page">
      <CabecalhoPagina titulo="Início" descricao="Organiza as fontes, prepara conteúdos e acompanha o trabalho de cada projeto." icone={LayoutDashboard}/>
      <div className="hub-toolbar flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <section className="min-w-0 flex-1 space-y-2" aria-labelledby="para-quem">
        <Label id="para-quem" htmlFor="sel-projeto" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Para quem?</Label>
        {ctx.estado === "a_carregar" && <Skeleton className="h-10 w-full max-w-sm" />}
        {ctx.estado === "erro" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível carregar os projetos</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>{ctx.erro}</span>
              <Button size="sm" variant="outline" onClick={ctx.recarregar}><RefreshCw className="mr-1 h-4 w-4" />Tentar de novo</Button>
            </AlertDescription>
          </Alert>
        )}
        {ctx.estado === "pronto" && (
          <>
            <Select value={ctx.projetoId ?? SEM} onValueChange={escolher} disabled={ctx.aGuardar}>
              <SelectTrigger id="sel-projeto" className="h-11 max-w-sm bg-card font-medium"><SelectValue placeholder="Escolhe o projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM}>Todos os projetos</SelectItem>
                {ctx.projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {ctx.aGuardar && <p className="text-xs text-muted-foreground">A guardar a escolha…</p>}
            {ctx.projetos.length === 0 && <p className="text-xs text-muted-foreground">Ainda não há projetos. <Link className="underline" to="/projects">Criar projeto</Link></p>}

          </>
        )}
      </section>
      <nav className="flex flex-wrap gap-2" aria-label="Ações rápidas">
        {PRODUCAO.filter(a => ["/curadoria", "/campanhas", "/pending?tab=create"].includes(a.url)).map((a, i) => (
          <Button key={a.url} asChild variant={i === 0 ? "default" : "outline"} className="h-11">
            <Link to={a.url}><a.icon className="mr-1.5 h-4 w-4" aria-hidden />{a.titulo}</Link>
          </Button>
        ))}
      </nav>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <Bloco className="flex flex-col gap-4 lg:col-span-8">
        <h2 id="continuar" className="text-lg font-semibold tracking-tight">Continuar onde ficaste</h2>
        {ctx.estado === "erro" && <p className="text-sm text-muted-foreground">Disponível depois de carregar os projetos.</p>}
        {ctx.estado !== "erro" && (resumo.estado === "a_carregar" || ctx.estado === "a_carregar") && <Skeleton className="h-16 w-full" />}
        {resumo.estado === "erro" && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o resumo</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>{resumo.erro}</span>
              <Button size="sm" variant="outline" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Button>
            </AlertDescription>
          </Alert>
        )}
        {resumo.estado === "pronto" && resumo.dados && ctx.estado === "pronto" && (
          <ul className="flex flex-col divide-y text-sm">
            <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-muted-foreground">Newsletter</div>
              {resumo.dados.ultimaEdicao
                ? <Link className="max-w-sm text-right font-medium text-primary hover:underline" to="/newsletter">Edição #{resumo.dados.ultimaEdicao.numero} · {resumo.dados.ultimaEdicao.estado}</Link>
                : <span>Sem edições{ctx.projetoId ? " neste projeto" : ""}</span>}
            </li>
            <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-muted-foreground">Rascunhos sociais</div>
              {resumo.dados.rascunhosSociais
                ? <Link className="max-w-sm text-right font-medium text-primary hover:underline" to="/drafts">{resumo.dados.rascunhosSociais} por concluir</Link>
                : <span>Nenhum rascunho</span>}
            </li>
            <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-muted-foreground">Artigos</div>
              {resumo.dados.ultimoArtigo
                ? <Link className="max-w-sm text-right font-medium text-primary hover:underline" to={`/artigos?id=${resumo.dados.ultimoArtigo.id}`}>{resumo.dados.ultimoArtigo.titulo} · {dataPt(resumo.dados.ultimoArtigo.updated_at)}</Link>
                : <span>Nenhum rascunho</span>}
            </li>
          </ul>
        )}
      </Bloco>
      <CustosBloco />
      <ConteudoBloco />
      <CalendarioBloco />
      <ProjetosBloco projetoId={ctx.estado === "pronto" ? ctx.projetoId : null} />
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="fazer">
        <h2 id="fazer" className="text-lg font-semibold tracking-tight">O que queres fazer?</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
          {PRODUCAO.map((a) => (
            <Link key={a.url} to={a.url} className="hub-action-tile group">
              <div className="flex w-full min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><a.icon className="size-4" aria-hidden /></span>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold leading-snug">{a.titulo}</div><div className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.desc}</div></div><ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden/>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Associações de newsletters">            {ctx.identidades.length > 0 && <details className="pt-1"><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">Associações da newsletter ao projeto</summary><div className="flex flex-col gap-3 pb-2">{ctx.identidades.map((i) => {
              const dono = ctx.projetos.find((p) => p.id === i.project_id);
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>A newsletter <strong>{i.nome}</strong> pertence a</span>
                  {admin ? (
                    <Select value={i.project_id ?? SEM} onValueChange={(v) => associar(i, v)}>
                      <SelectTrigger className="h-8 w-56" aria-label={`Projeto da newsletter ${i.nome}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM}>Sem projeto associado</SelectItem>
                        {ctx.projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <strong>{dono?.name ?? "nenhum projeto"}</strong>}
                  {ctx.projetoId && i.project_id !== ctx.projetoId && (
                    <span className="text-xs text-muted-foreground">(não pertence ao projeto escolhido: a newsletter fica oculta neste filtro)</span>
                  )}
                </div>
              );
            })}</div></details>}</section>
      {admin && (
        <section className="space-y-1" aria-labelledby="configuracao">
          <h2 id="configuracao" className="text-sm font-medium text-muted-foreground">Configuração</h2>
          <ul className="divide-y rounded-md border text-sm">
            {CONFIGURACAO.map((a) => (
              <li key={a.url}>
                <Link to={a.url} className="flex items-center gap-2 px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <a.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{a.titulo}</span>
                  <span className="truncate text-xs text-muted-foreground">{a.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
