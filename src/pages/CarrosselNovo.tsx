import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjeto } from "@/contexts/ProjetoContext";
import { criarTrabalho } from "@/services/motor";
import { avaliarFonte, LIMITES_FONTE, MARCADOR_FIXTURE, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";

/** Synthetic fixture for the deterministic demo provider (never real user text). */
export const FIXTURE_DEMO = `${MARCADOR_FIXTURE} Teste sintético R3. Este texto existe apenas para demonstrar o motor.

1. A biblioteca municipal fictícia de Vale Claro abriu uma sala de leitura com quarenta lugares.
2. A sala funciona de segunda a sábado e empresta livros, jornais e revistas.
3. O espaço foi pensado para estudantes e para leitores que procuram silêncio.`;

export default function CarrosselNovo() {
  const nav = useNavigate();
  const { projetos, projetoId, estado } = useProjeto();
  const [projeto, setProjeto] = useState<string>(projetoId ?? "");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [tom, setTom] = useState("");
  const [slides, setSlides] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);
  const [aCriar, setACriar] = useState(false);

  const fonte = useMemo(() => normalizarFonte(texto), [texto]);
  const av = useMemo(() => avaliarFonte(fonte), [fonte]);
  const nSlides = Math.min(av.slidesMax || LIMITES_FONTE.maxSlides, Math.max(2, slides ?? av.slidesSugeridos));
  const podeCriar = !!projeto && av.ok && !aCriar;

  const criar = async () => {
    if (!podeCriar) return;
    setACriar(true);
    try {
      const r = await criarTrabalho({ project_id: projeto, texto, titulo, objetivo, tom, slides: nSlides, modo: demo ? "demonstracao" : "estruturacao" });
      if (r.reutilizado) toast.info("Já existia um carrossel com esta fonte e estas opções; foi aberto.");
      nav(`/estudio/carrosseis/${r.trabalho_id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setACriar(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-0">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9" aria-label="Voltar aos carrosséis"><Link to="/estudio/carrosseis"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-semibold">Novo carrossel</h1>
          <p className="text-sm text-muted-foreground">Fonte → Conteúdo → Design</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3" aria-label="Fonte">
          <div className="space-y-1">
            <Label htmlFor="projeto">Para quem?</Label>
            <Select value={projeto} onValueChange={setProjeto} disabled={estado !== "pronto"}>
              <SelectTrigger id="projeto" className="h-11 sm:h-9"><SelectValue placeholder={projetos.length ? "Escolhe o projeto" : "Sem projetos disponíveis"} /></SelectTrigger>
              <SelectContent>{projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="titulo">Título <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input id="titulo" className="h-11 sm:h-9" maxLength={300} value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={demo} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="texto">Texto da fonte</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{fonte.caracteres.toLocaleString("pt-PT")} / {LIMITES_FONTE.max.toLocaleString("pt-PT")}</span>
            </div>
            <Textarea id="texto" rows={12} className="text-base sm:text-sm" value={texto} readOnly={demo}
              onChange={(e) => { setTexto(e.target.value); setSlides(null); }}
              placeholder="Cola aqui o texto: artigo, notas ou parágrafos numerados." />
            {!av.ok && texto.trim() && <p className="text-xs text-destructive" role="status">{av.motivo}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="objetivo">Objetivo <span className="font-normal text-muted-foreground">(breve)</span></Label>
              <Input id="objetivo" className="h-11 sm:h-9" maxLength={200} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tom">Tom</Label>
              <Input id="tom" className="h-11 sm:h-9" maxLength={80} value={tom} onChange={(e) => setTom(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="slides">Número de slides</Label>
            <Input id="slides" type="number" inputMode="numeric" className="h-11 w-28 sm:h-9" min={2} max={av.slidesMax || 2} value={av.ok ? nSlides : ""} disabled={!av.ok}
              onChange={(e) => setSlides(Number(e.target.value) || null)} />
            <p className="text-xs text-muted-foreground">
              {av.ok ? `Sugestão: ${av.slidesSugeridos}. Este texto permite até ${av.slidesMax} (capa, um slide por parágrafo e fecho com a fonte).` : "Depende do texto."}
            </p>
          </div>
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Nesta fase o carrossel é estruturado sem IA: cada frase vem do texto, com a referência ao parágrafo, e nada é inventado. Depois podes editar o conteúdo e o design.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-11 sm:h-9" disabled={!podeCriar} onClick={criar}>{aCriar && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />}Criar carrossel</Button>
            {!demo ? (
              <Button variant="ghost" className="h-11 sm:h-9" onClick={() => { setDemo(true); setTexto(FIXTURE_DEMO); setTitulo(""); setSlides(null); }}>
                <FlaskConical className="mr-1.5 h-4 w-4" />Usar texto de demonstração
              </Button>
            ) : (
              <Button variant="ghost" className="h-11 sm:h-9" onClick={() => { setDemo(false); setTexto(""); }}>Sair da demonstração</Button>
            )}
          </div>
          {demo && <p className="text-xs text-muted-foreground" role="status">Demonstração: texto sintético de testes processado por um fornecedor simulado. Não usa IA real nem o teu conteúdo.</p>}
        </section>

        <section className="space-y-2" aria-label="Pré-visualização da fonte">
          <h2 className="text-sm font-semibold">Pré-visualização da fonte</h2>
          {fonte.paragrafos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Os parágrafos aparecem aqui numerados, tal como serão citados.</p>
          ) : (
            <ol className="max-h-[60vh] space-y-2 overflow-y-auto rounded-md border border-border bg-card p-3">
              {fonte.paragrafos.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm"><span className="w-7 shrink-0 tabular-nums text-muted-foreground">§{i + 1}</span><span>{p}</span></li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
