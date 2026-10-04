import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, FileText, Images, KeyRound, Mail, PenSquare, RefreshCw, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjeto } from "@/contexts/ProjetoContext";
import { associarIdentidade, resumoContinuidade, souAdminNewsletter, type Continuidade, type Identidade } from "@/services/estudio";

const SEM = "__sem__";
const dataPt = (s: string) => new Date(s).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });

interface Acao { titulo: string; desc: string; icon: typeof Mail; url: string }
const PRODUCAO: Acao[] = [
  { titulo: "Carrossel", desc: "A partir de texto, link ou PDF", icon: GalleryHorizontal, url: "/estudio/carrosseis" },
  { titulo: "Newsletter", desc: "Edições, crónica e arquivo", icon: Mail, url: "/newsletter" },
  { titulo: "Carrosséis da crónica", desc: "A partir de edições enviadas", icon: Images, url: "/estudio/redes-sociais" },
  { titulo: "Publicação livre", desc: "Um post do zero", icon: PenSquare, url: "/manual-create" },
  { titulo: "Artigos", desc: "Rascunhos de blog", icon: FileText, url: "/artigos" },
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
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Estúdio de conteúdos</h1>

      <section className="space-y-2" aria-labelledby="para-quem">
        <Label id="para-quem" htmlFor="sel-projeto" className="text-sm font-medium text-muted-foreground">Para quem?</Label>
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
              <SelectTrigger id="sel-projeto" className="max-w-sm"><SelectValue placeholder="Escolhe o projeto" /></SelectTrigger>
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

      <section className="space-y-2" aria-labelledby="continuar">
        <h2 id="continuar" className="text-sm font-medium text-muted-foreground">Continuar onde ficaste</h2>
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
            <li className="rounded-md border p-3">
              <div className="text-muted-foreground">Newsletter</div>
              {resumo.dados.ultimaEdicao
                ? <Link className="font-medium hover:underline" to="/newsletter">Edição #{resumo.dados.ultimaEdicao.numero} · {resumo.dados.ultimaEdicao.estado}</Link>
                : <span>Sem edições{ctx.projetoId ? " neste projeto" : ""}</span>}
            </li>
            <li className="rounded-md border p-3">
              <div className="text-muted-foreground">Rascunhos sociais</div>
              {resumo.dados.rascunhosSociais
                ? <Link className="font-medium hover:underline" to="/drafts">{resumo.dados.rascunhosSociais} por concluir</Link>
                : <span>Nenhum rascunho</span>}
            </li>
            <li className="rounded-md border p-3">
              <div className="text-muted-foreground">Artigos</div>
              {resumo.dados.ultimoArtigo
                ? <Link className="font-medium hover:underline" to={`/artigos?id=${resumo.dados.ultimoArtigo.id}`}>{resumo.dados.ultimoArtigo.titulo} · {dataPt(resumo.dados.ultimoArtigo.updated_at)}</Link>
                : <span>Nenhum rascunho</span>}
            </li>
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="fazer">
        <h2 id="fazer" className="text-sm font-medium text-muted-foreground">O que queres fazer?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PRODUCAO.map((a) => (
            <Link key={a.url} to={a.url} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full p-3 transition-colors hover:border-primary">
                <a.icon className="mb-1.5 h-5 w-5 text-primary" aria-hidden />
                <div className="font-medium leading-tight">{a.titulo}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.desc}</div>
              </Card>
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
