import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { abrirTrabalho, criarTrabalho, type TrabalhoCompleto } from "@/services/motor";
import { FRAMEWORKS, obterFramework, type Framework } from "../../../supabase/functions/_shared/motor/frameworks";
import type { PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";
import { fundirProposta, guardarPendente, lerPendente, type EstruturaPendente } from "./estruturas";

interface Props {
  dados: TrabalhoCompleto;
  atual: PropostaEditorial;
  /** Persists the merged narrative as a new version (composition kept). */
  aceitar: (conteudo: PropostaEditorial) => Promise<void>;
}

/** Five framework buttons; each click asks for a comparable, reversible PROPOSAL (never applied alone). */
export function PainelEstruturas({ dados, atual, aceitar }: Props) {
  const origem = dados.trabalho.id;
  const [escolha, setEscolha] = useState<Framework | null>(null);
  const [slides, setSlides] = useState(atual.slides.length);
  const [aPedir, setAPedir] = useState(false);
  const [pendente, setPendente] = useState<EstruturaPendente | null>(() => lerPendente(origem));
  const [fw, setFw] = useState<TrabalhoCompleto | null>(null);
  const [aAceitar, setAAceitar] = useState(false);

  const ler = useCallback(async () => {
    if (!pendente) return;
    try { setFw(await abrirTrabalho(pendente.trabalho)); } catch { /* volta a tentar no próximo ciclo */ }
  }, [pendente]);
  useEffect(() => { ler(); }, [ler]);
  const emCurso = !!pendente && (!fw || fw.trabalho.estado === "pendente" || fw.trabalho.estado === "a_processar");
  useEffect(() => {
    if (!emCurso) return;
    const t = setInterval(ler, 4000);
    return () => clearInterval(t);
  }, [emCurso, ler]);

  const pedir = async () => {
    if (!escolha) return;
    setAPedir(true);
    try {
      const r = await criarTrabalho({
        project_id: dados.trabalho.project_id, texto: dados.fonte.texto, titulo: dados.fonte.titulo ?? atual.titulo,
        objetivo: atual.objetivo, tom: atual.tom, slides, modo: "ia", framework: escolha.id, origem_trabalho: origem,
      });
      const p = { trabalho: r.trabalho_id, framework: escolha.id };
      guardarPendente(origem, p); setPendente(p); setFw(null); setEscolha(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setAPedir(false); }
  };

  const cancelar = () => { guardarPendente(origem, null); setPendente(null); setFw(null); };

  const proposta = fw?.proposta.conteudo ?? null;
  const fusao = proposta ? fundirProposta(atual, proposta) : null;
  const confirmarAceitar = async () => {
    if (!fusao?.ok) return;
    setAAceitar(true);
    try { await aceitar(fusao.conteudo); cancelar(); toast.success("Nova narrativa guardada. A composição manteve-se."); }
    catch (e) { toast.error((e as Error).message); }
    finally { setAAceitar(false); }
  };
  const nomeFw = obterFramework(pendente?.framework)?.nome ?? "";

  return (
    <section aria-labelledby="t-estr" className="space-y-3 rounded-[var(--mc-r-lg)] border border-border bg-card p-4">
      <div>
        <h2 id="t-estr" className="text-sm font-medium">Reestruturar com IA</h2>
        <p className="text-xs text-muted-foreground">Cria uma proposta a partir da mesma fonte. Nada muda até aceitares.</p>
      </div>
      {!pendente && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {FRAMEWORKS.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => { setSlides(atual.slides.length); setEscolha(f); }}
                className="mc-trans flex min-h-14 w-full flex-col items-start rounded-[var(--mc-r-md)] border border-input p-3 text-left hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="text-sm font-medium">{f.nome}</span>
                <span className="text-xs text-muted-foreground">{f.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendente && emCurso && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A preparar a proposta «{nomeFw}» no servidor…</p>
      )}
      {pendente && fw && ["erro", "desconhecido", "cancelado"].includes(fw.trabalho.estado) && (
        <div className="space-y-2 text-sm">
          <p role="alert">A proposta «{nomeFw}» não foi criada: {fw.trabalho.erro ?? "erro desconhecido"}. A narrativa atual não mudou.</p>
          <Button variant="outline" className="h-11" onClick={cancelar}>Fechar</Button>
        </div>
      )}
      {pendente && proposta && fusao && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Proposta «{nomeFw}» · compara com o texto atual</p>
          <ol className="space-y-2">
            {proposta.slides.map((s, i) => (
              <li key={s.id} className="grid gap-2 rounded-[var(--mc-r-md)] border border-border p-3 text-sm sm:grid-cols-2">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">Atual · slide {i + 1}</p><p className="font-medium">{atual.slides[i]?.titulo ?? "—"}</p><p className="text-muted-foreground">{atual.slides[i]?.texto ?? ""}</p></div>
                <div className="min-w-0"><p className="text-xs text-muted-foreground">Proposta · slide {i + 1} · §{s.fontes.join(", §")}</p><p className="font-medium">{s.titulo}</p><p className="text-muted-foreground">{s.texto}</p></div>
              </li>
            ))}
          </ol>
          {fusao.ok === false && (
            <p className="text-sm text-muted-foreground">A proposta tem {fusao.proposta} slides e a composição atual tem {fusao.atual}. Para não apagar a composição, abre-a como carrossel separado.</p>
          )}
          <p className="text-xs text-muted-foreground">Aceitar cria uma nova versão: a aprovação e a exportação atuais deixam de valer para ela. A composição e as versões anteriores mantêm-se.</p>
          <div className="flex flex-wrap gap-2">
            {fusao.ok
              ? <Button className="h-11" disabled={aAceitar} onClick={confirmarAceitar}>{aAceitar && <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" />}Aceitar proposta</Button>
              : <Button asChild className="h-11"><Link to={`/estudio/carrosseis/${pendente.trabalho}`}>Abrir como carrossel separado</Link></Button>}
            <Button variant="ghost" className="h-11" onClick={cancelar}>Cancelar e manter o atual</Button>
          </div>
        </div>
      )}

      <Dialog open={!!escolha} onOpenChange={(o) => !o && setEscolha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposta «{escolha?.nome}»</DialogTitle>
            <DialogDescription>
              Usa a fonte congelada deste carrossel e a DeepSeek (deepseek-flash). Conta 1 pedido no limite diário do projeto (até 2 se a primeira resposta precisar de correção). Não inventa factos nem promessas; cada slide cita §.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="fw-slides">Número de slides</Label>
            <Input id="fw-slides" type="number" className="h-11 w-28" min={2} max={20} value={slides} onChange={(e) => setSlides(Math.max(2, Math.min(20, Number(e.target.value) || 2)))} />
            {slides !== atual.slides.length && <p className="text-xs text-muted-foreground">Com um número diferente de {atual.slides.length}, a proposta só poderá abrir como carrossel separado.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="h-11" onClick={() => setEscolha(null)}>Cancelar</Button>
            <Button className="h-11" disabled={aPedir} onClick={pedir}>{aPedir ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}Criar proposta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
