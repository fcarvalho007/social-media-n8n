import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { traducaoGuardada, traduzirFonte } from "@/services/motor";
import { normalizarFonte } from "../../../supabase/functions/_shared/motor/proposta";
import { detetarIdioma, hashTexto, NOME_IDIOMA } from "../../../supabase/functions/_shared/motor/traducao";

export type EscolhaIdioma = "pt" | "original";
export interface EstadoIdioma { estrangeiro: boolean; escolha: EscolhaIdioma; traducaoId: string | null; pronto: boolean }

/**
 * Foreign-source handling: honest detection, side-by-side original/PT-PT, one confirmed paid request per
 * source hash, stored translation reused for free. Stale responses for an older source are discarded.
 */
export function PainelIdioma({ projectId, texto, iaDisponivel, onEstado }: { projectId: string; texto: string; iaDisponivel: boolean; onEstado: (e: EstadoIdioma) => void }) {
  const fonte = useMemo(() => normalizarFonte(texto), [texto]);
  const det = useMemo(() => detetarIdioma(fonte.texto), [fonte.texto]);
  const estrangeiro = det.idioma !== "pt";
  const [hash, setHash] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<EscolhaIdioma>("pt");
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
  useEffect(() => {
    onEstado({ estrangeiro, escolha, traducaoId: valida && escolha === "pt" ? trad!.id : null, pronto: !estrangeiro || escolha === "original" || valida });
  }, [estrangeiro, escolha, valida, trad, onEstado]);

  if (!estrangeiro) return null;

  const traduzir = async (repetir = false) => {
    const pedidoHash = hash;
    setFase("a_traduzir"); setErro(null);
    try {
      const r = await traduzirFonte(projectId, texto, repetir);
      if (atual.current !== pedidoHash || r.hash !== pedidoHash) return; // stale: source changed meanwhile
      setTrad({ hash: r.hash, id: r.traducao_id, paragrafos: r.paragrafos }); setFase("inicio"); setRever(true);
    } catch (e) {
      if (atual.current !== pedidoHash) return;
      const m = (e as Error).message;
      setErro(m); setFase("erro"); setPodeRepetir(/Tradução recusada/.test(m));
    }
  };

  const nome = NOME_IDIOMA[det.idioma];
  return (
    <section className="space-y-3 rounded-[var(--mc-r-lg)] border border-border bg-card p-3 text-sm" aria-label="Língua da fonte">
      <div className="flex flex-wrap items-center gap-2">
        <Languages className="h-4 w-4 text-primary" aria-hidden />
        <strong className="font-medium">{det.confianca === "alta" ? `A fonte parece estar em ${nome}.` : `A fonte pode não estar em português (parece ${nome}).`}</strong>
        <span className="text-muted-foreground">O carrossel é sempre escrito em PT-PT; o original fica guardado sem alterações.</span>
      </div>
      <div role="radiogroup" aria-label="Como usar a fonte" className="flex flex-wrap gap-2">
        {([["pt", "Avançar em PT-PT"], ["original", "Usar língua original"]] as const).map(([id, nomeOp]) => (
          <button key={id} type="button" role="radio" aria-checked={escolha === id} onClick={() => setEscolha(id)}
            className={cn("min-h-11 rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              escolha === id ? "border-primary bg-primary/10 font-medium" : "border-input text-muted-foreground")}>{nomeOp}</button>
        ))}
        {valida && <Button type="button" variant="ghost" className="h-11" aria-expanded={rever} onClick={() => setRever((v) => !v)}>{rever ? "Esconder tradução" : "Rever tradução"}</Button>}
      </div>

      {escolha === "pt" && !valida && (
        <div className="space-y-2" aria-live="polite">
          {!iaDisponivel ? (
            <p className="text-xs text-muted-foreground">A IA não está disponível hoje neste projeto, por isso não é possível preparar a versão PT-PT. Escolhe «Usar língua original» ou ajusta os limites.</p>
          ) : fase === "a_traduzir" ? (
            <p className="flex items-center gap-2 text-xs"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />A preparar versão PT-PT…</p>
          ) : fase === "confirmar" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs">Usa 1 pedido pago à DeepSeek (conta no limite diário do projeto). Números, nomes, citações e endereços são verificados.</span>
              <Button className="h-11 sm:h-9" onClick={() => traduzir(false)}>Confirmar tradução</Button>
              <Button variant="ghost" className="h-11 sm:h-9" onClick={() => setFase("inicio")}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button className="h-11 sm:h-9" disabled={!hash} onClick={() => setFase("confirmar")}>Preparar versão PT-PT</Button>
              {fase === "erro" && erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
              {fase === "erro" && podeRepetir && <Button variant="outline" className="h-11 sm:h-9" onClick={() => traduzir(true)}>Repetir uma vez (1 pedido)</Button>}
            </div>
          )}
        </div>
      )}

      {valida && rever && (
        <div className="grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2" aria-label="Original e versão PT-PT">
          <div><p className="mb-1 text-xs font-medium text-muted-foreground">Original ({nome})</p>
            <ol className="space-y-2 text-xs">{fonte.paragrafos.map((p, i) => <li key={i}><span className="tabular-nums text-muted-foreground">§{i + 1}</span> {p}</li>)}</ol></div>
          <div><p className="mb-1 text-xs font-medium text-muted-foreground">PT-PT</p>
            <ol className="space-y-2 text-xs">{trad!.paragrafos.map((p, i) => <li key={i}><span className="tabular-nums text-muted-foreground">§{i + 1}</span> {p}</li>)}</ol></div>
        </div>
      )}
    </section>
  );
}
