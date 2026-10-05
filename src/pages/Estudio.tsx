import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, FileText, GalleryHorizontal, Images, KeyRound, Mail, PlusCircle, RefreshCw, Upload } from "lucide-react";
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
  { titulo: "Criar SM", desc: "Manual ou assistido por IA", icon: PlusCircle, url: "/pending?tab=create" },
  { titulo: "Meus carrosséis", desc: "Por publicar e publicados", icon: GalleryHorizontal, url: "/estudio/carrosseis" },
  { titulo: "Newsletter", desc: "Edições, crónica e arquivo", icon: Mail, url: "/newsletter" },
  { titulo: "Carrosséis da crónica", desc: "A partir de edições enviadas", icon: Images, url: "/estudio/redes-sociais" },
  { titulo: "Artigos", desc: "Rascunhos de texto, sem publicação", icon: FileText, url: "/artigos" },
];
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
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 py-4 xs:px-3 sm:px-0 sm:py-0">
      <h1 className="sr-only">Painel</h1>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
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
              <SelectTrigger id="sel-projeto" className="h-12 max-w-sm rounded-2xl bg-card font-semibold"><SelectValue placeholder="Escolhe o projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM}>Todos os projetos</SelectItem>
                {ctx.projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {ctx.aGuardar && <p className="text-xs text-muted-foreground">A guardar a escolha…</p>}
            {ctx.projetos.length === 0 && <p className="text-xs text-muted-foreground">Ainda não há projetos. <Link className="underline" to="/projects">Criar projeto</Link></p>}
            {ctx.identidades.map((i) => {
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
            })}
          </>
        )}
      </section>
      <nav className="flex flex-wrap gap-2" aria-label="Ações rápidas">
        {PRODUCAO.slice(0, 3).map((a, i) => (
          <Button key={a.url} asChild variant={i === 0 ? "default" : "outline"} className="h-11 rounded-xl font-semibold">
            <Link to={a.url}><a.icon className="mr-1.5 h-4 w-4" aria-hidden />{a.titulo}</Link>
          </Button>
        ))}
      </nav>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <Bloco className="flex flex-col justify-center space-y-3 lg:col-span-8">
        <h2 id="continuar" className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">Continuar onde ficaste</h2>
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
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-2xl border bg-background p-4">
              <div className="text-muted-foreground">Newsletter</div>
              {resumo.dados.ultimaEdicao
                ? <Link className="font-medium hover:underline" to="/newsletter">Edição #{resumo.dados.ultimaEdicao.numero} · {resumo.dados.ultimaEdicao.estado}</Link>
                : <span>Sem edições{ctx.projetoId ? " neste projeto" : ""}</span>}
            </li>
            <li className="rounded-2xl border bg-background p-4">
              <div className="text-muted-foreground">Rascunhos sociais</div>
              {resumo.dados.rascunhosSociais
                ? <Link className="font-medium hover:underline" to="/drafts">{resumo.dados.rascunhosSociais} por concluir</Link>
                : <span>Nenhum rascunho</span>}
            </li>
            <li className="rounded-2xl border bg-background p-4">
              <div className="text-muted-foreground">Artigos</div>
              {resumo.dados.ultimoArtigo
                ? <Link className="font-medium hover:underline" to={`/artigos?id=${resumo.dados.ultimoArtigo.id}`}>{resumo.dados.ultimoArtigo.titulo} · {dataPt(resumo.dados.ultimoArtigo.updated_at)}</Link>
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

      <section className="space-y-2" aria-labelledby="fazer">
        <h2 id="fazer" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">O que queres fazer?</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
          {PRODUCAO.map((a) => (
            <Link key={a.url} to={a.url} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex h-full min-h-11 items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary">
                <a.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div><div className="font-medium leading-tight">{a.titulo}</div><div className="mt-0.5 text-sm text-muted-foreground">{a.desc}</div></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

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
