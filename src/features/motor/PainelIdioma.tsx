import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { traducaoGuardada, traduzirFonte } from "@/services/motor";
import { avaliarFonte, LIMITES_FONTE, MARGEM_TRADUCAO, normalizarFonte } from "../../../supabase/functions/_shared/motor/proposta";
import { detetarIdioma, hashTexto, NOME_IDIOMA } from "../../../supabase/functions/_shared/motor/traducao";

const LIMITE_TRADUCAO = Math.ceil(LIMITES_FONTE.max * MARGEM_TRADUCAO);

export type EscolhaIdioma = "pt" | "original";
export interface EstadoIdioma { estrangeiro: boolean; escolha: EscolhaIdioma; traducaoId: string | null; pronto: boolean; motivoBloqueio?: string | null }

/**
 * Foreign-source handling: honest detection, side-by-side original/PT-PT, one confirmed paid request per
 * source hash, stored translation reused for free. Stale responses for an older source are discarded.
 */
export function PainelIdioma({ projectId, texto, iaDisponivel, onEstado, onEncurtar, escolhaInicial = "pt" }: { projectId: string; texto: string; iaDisponivel: boolean; escolhaInicial?: EscolhaIdioma; onEstado: (e: EstadoIdioma) => void; onEncurtar?: () => void }) {
  const fonte = useMemo(() => normalizarFonte(texto), [texto]);
  const det = useMemo(() => detetarIdioma(fonte.texto), [fonte.texto]);
  const estrangeiro = det.idioma !== "pt";
  const [hash, setHash] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<EscolhaIdioma>(escolhaInicial);
  useEffect(() => { setEscolha(escolhaInicial); }, [escolhaInicial]);
  const [trad, setTrad] = useState<{ hash: string; id: string; paragrafos: string[] } | null>(null);
  const [fase, setFase] = useState<"inicio" | "confirmar" | "a_traduzir" | "erro">("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const [podeRepetir, setPodeRepetir] = useState(false);
  const [rever, setRever] = useState(true);
  const atual = useRef<string | null>(null);

  // New source => new hash; any older translation or in-flight response no longer applies.
  useEffect(() => {
    let vivo = true;
    setTrad(null); setFase("inicio"); setErro(null); setPodeRepetir(false);
    if (!estrangeiro) { setHash(null); atual.current = null; return; }
    hashTexto(fonte.texto).then(async (h) => {
      if (!vivo) return;
      setHash(h); atual.current = h;
      const g = await traducaoGuardada(projectId, h).catch(() => null);
      if (vivo && g && atual.current === h) setTrad({ hash: h, id: g.id, paragrafos: g.resultado });
    });
    return () => { vivo = false; };
  }, [fonte.texto, estrangeiro, projectId]);

  const valida = !!trad && trad.hash === hash;
  // Same rebuild and rule as the server (join + normalise + translation margin), so accepted here = accepted there.
  const avTrad = useMemo(() => (trad ? avaliarFonte(normalizarFonte(trad.paragrafos.join("\n\n")), { traducao: true }) : null), [trad]);
  const caracteresTrad = useMemo(() => (trad ? normalizarFonte(trad.paragrafos.join("\n\n")).caracteres : null), [trad]);
  const tradExcede = valida && escolha === "pt" && !!avTrad && !avTrad.ok;
  useEffect(() => {
    onEstado({ estrangeiro, escolha, traducaoId: valida && escolha === "pt" ? trad!.id : null, pronto: !estrangeiro || escolha === "original" || (valida && !tradExcede), motivoBloqueio: tradExcede ? `A versão PT-PT tem ${caracteresTrad!.toLocaleString("pt-PT")} caracteres; o limite das traduções é ${LIMITE_TRADUCAO.toLocaleString("pt-PT")}. Usa o original como fonte ou encurta o texto.` : null });
  }, [estrangeiro, escolha, valida, trad, onEstado, tradExcede, caracteresTrad]);

  if (!estrangeiro) return null;

  const traduzir = async (repetir = false) => {
    const pedidoHash = hash;
    setFase("a_traduzir"); setErro(null);
    try {
      const r = await traduzirFonte(projectId, texto, repetir);
      if (atual.current !== pedidoHash) return; // stale: source changed meanwhile
      if ("recusada" in r) { setErro(r.motivo); setFase("erro"); setPodeRepetir(!repetir && !r.final); return; }
      if (r.hash !== pedidoHash) return;
      setTrad({ hash: r.hash, id: r.traducao_id, paragrafos: r.paragrafos }); setFase("inicio"); setRever(true);
    } catch (e) {
      if (atual.current !== pedidoHash) return;
      const m = (e as Error).message;
      setErro(m); setFase("erro"); setPodeRepetir(/Tradução recusada/.test(m));
    }
  };

  const nome = NOME_IDIOMA[det.idioma];
  return (
    <section className="space-y-2 rounded-[var(--mc-r-lg)] border border-border bg-card px-3 py-2.5 text-sm" aria-label="Língua da fonte">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex min-w-0 flex-1 items-center gap-2">
          <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span><strong className="font-medium">{det.confianca === "alta" ? `Fonte em ${nome}.` : `Fonte possivelmente em ${nome}.`}</strong>{" "}
            <span className="text-muted-foreground">O carrossel é sempre escrito em PT-PT.</span></span>
        </p>
        <div role="radiogroup" aria-label="Como usar a fonte" className="inline-flex rounded-full border border-input p-0.5">
          {([["pt", "Traduzir para PT-PT"], ["original", "Usar o original"]] as const).map(([id, nomeOp]) => (
            <button key={id} type="button" role="radio" aria-checked={escolha === id} onClick={() => setEscolha(id)}
              className={cn("mc-trans min-h-9 rounded-full px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                escolha === id ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}>{nomeOp}</button>
          ))}
        </div>
        {valida && <Button type="button" variant="ghost" size="sm" aria-expanded={rever} onClick={() => setRever((v) => !v)}>{rever ? "Esconder tradução" : "Rever tradução"}</Button>}
      </div>

      {escolha === "original" && <p className="text-xs text-muted-foreground">O original fica como fonte, sem alterações; o texto final continua em PT-PT.</p>}
      {valida && escolha === "pt" && caracteresTrad != null && (
        tradExcede
          ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
              <span>Versão PT-PT: {caracteresTrad.toLocaleString("pt-PT")} caracteres — acima do limite de {LIMITE_TRADUCAO.toLocaleString("pt-PT")}.</span>
              <Button variant="outline" size="sm" onClick={() => setEscolha("original")}>Usar o original</Button>
              {onEncurtar && <Button variant="ghost" size="sm" onClick={onEncurtar}>Voltar à Fonte para encurtar</Button>}
            </div>
          : <p className="text-xs tabular-nums text-muted-foreground">Versão PT-PT pronta: {caracteresTrad.toLocaleString("pt-PT")} caracteres.</p>
      )}
      {escolha === "pt" && !valida && (
        <div className="space-y-2" aria-live="polite">
          {!iaDisponivel ? (
            <p className="text-xs text-muted-foreground">A IA não está disponível hoje neste projeto. Escolhe «Usar o original»; o carrossel continua em PT-PT.</p>
          ) : fase === "a_traduzir" ? (
            <p className="flex items-center gap-2 text-xs"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />A preparar a versão PT-PT…</p>
          ) : fase === "erro" && erro ? (
            <div role="status" className="space-y-2 rounded-[var(--mc-r-md)] border border-border bg-muted/50 p-2.5 text-xs">
              <p><strong className="font-medium">A tradução não passou na verificação.</strong> <span className="text-muted-foreground">{erro.replace(/^Tradução recusada:\s*/, "")}</span></p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEscolha("original")}>Avançar com o original</Button>
                {podeRepetir && <Button variant="ghost" size="sm" onClick={() => traduzir(true)}>Repetir uma vez (1 pedido)</Button>}
              </div>
            </div>
          ) : fase === "confirmar" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">1 pedido pago à DeepSeek. Números, nomes e endereços são verificados.</span>
              <Button variant="outline" size="sm" onClick={() => traduzir(false)}>Confirmar tradução</Button>
              <Button variant="ghost" size="sm" onClick={() => setFase("inicio")}>Cancelar</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" disabled={!hash} onClick={() => setFase("confirmar")}>Preparar versão PT-PT</Button>
          )}
        </div>
      )}

      {valida && rever && (
        <div className="grid max-h-72 gap-3 overflow-y-auto border-t border-border pt-2 sm:grid-cols-2" aria-label="Original e versão PT-PT">
          <div><p className="mb-1 text-xs font-medium text-muted-foreground">Original ({nome})</p>
            <ol className="space-y-2 text-xs">{fonte.paragrafos.map((p, i) => <li key={i}><span className="tabular-nums text-muted-foreground">§{i + 1}</span> {p}</li>)}</ol></div>
          <div><p className="mb-1 text-xs font-medium text-muted-foreground">PT-PT</p>
            <ol className="space-y-2 text-xs">{trad!.paragrafos.map((p, i) => <li key={i}><span className="tabular-nums text-muted-foreground">§{i + 1}</span> {p}</li>)}</ol></div>
        </div>
      )}
    </section>
  );
}
