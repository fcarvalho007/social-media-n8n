// Cover chooser: three distinct impact strategies, previewed with the editor's own renderer.
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { cn } from "@/lib/utils";
import type { Asset, Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarCapa, camadaFotoCapa, propostasCapa, type CapaId } from "../../../supabase/functions/_shared/motor/capas";
import { carregarImagem } from "@/features/editor-grafico/desenho";
import { SugestaoFotos } from "./SugestaoFotos";
import { previaPagina } from "./variacoes";

interface Props {
  pacote: PacoteProva;
  variante: Variante;
  medidor: Medidor;
  imagens: Record<string, HTMLImageElement>;
  onAplicar: (p: PacoteProva) => void;
  /** Narrow side panel: one proposal per row with a fixed thumbnail width. */
  compacto?: boolean;
  /** Enables «Trocar fotografia» on the photo cover (free search). */
  projectId?: string;
}

export function EscolhaCapa({ pacote, variante, medidor, imagens, onAplicar, compacto = false, projectId }: Props) {
  const marca = pacote.variantes[variante].paginas[0]?.fundo ?? "#3e5b46";
  const [foto, setFoto] = useState<{ asset: Asset; nome: string } | null>(null);
  const [imgFoto, setImgFoto] = useState<HTMLImageElement | null>(null);
  useEffect(() => { let vivo = true; setImgFoto(null); if (foto) carregarImagem(foto.asset).then((i) => vivo && setImgFoto(i)).catch(() => undefined); return () => { vivo = false; }; }, [foto]);
  const base = useMemo(() => (foto ? { ...pacote, assets: { ...pacote.assets, [foto.asset.id]: foto.asset } } : pacote), [pacote, foto]);
  const todas = useMemo(() => (foto && imgFoto ? { ...imagens, [foto.asset.id]: imgFoto } : imagens), [imagens, foto, imgFoto]);
  const opcoes = useMemo(() => propostasCapa(base, variante, marca, medidor, foto ? camadaFotoCapa(foto.asset, foto.nome) : undefined), [base, variante, marca, medidor, foto]);
  const titulo = pacote.conteudo.slides[0]?.titulo ?? "";
  const emUso = pacote.variantes[variante].paginas[0]?.camadas.find((c) => c.id.startsWith("mod-capa-"))?.id;
  const idEmUso: CapaId | null = !emUso ? null : emUso.includes("dado") || emUso.includes("bloco") ? "dado" : emUso.includes("gradiente") || emUso.includes("marcador") ? "foto" : "manifesto";
  const [sel, setSel] = useState<CapaId | null>(null);
  const escolhida = opcoes.find((o) => o.id === sel);
  if (!opcoes.length) return null;
  const largura = compacto ? 200 : typeof window !== "undefined" && window.innerWidth <= 480 ? Math.min(280, window.innerWidth - 80) : 220;
  return (
    <section aria-labelledby="t-capa" className="space-y-3">
      <div>
        <h2 id="t-capa" className="text-base font-semibold">Capa</h2>
        <p className="text-xs text-muted-foreground">A capa decide se alguém desliza. Escolhe uma de três estratégias; o texto aprovado não muda e os outros slides herdam a cor de destaque.</p>
      </div>
      <ul className={compacto ? "flex flex-col gap-3" : "flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible"} aria-label="Propostas de capa">
        {opcoes.map((o) => (
          <li key={o.id} className="shrink-0 snap-start">
            <button type="button" disabled={!o.cabe} aria-pressed={sel === o.id} onClick={() => setSel(o.id)}
              className={cn("block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                sel === o.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30")}>
              <span className="block overflow-hidden rounded-[var(--mc-r-sm)]">
                <PaginaCanvas pacote={previaPagina(base, variante, o.pagina)} variante={variante} indice={0} medidor={medidor} imagens={todas} escala={largura / 1080} />
              </span>
              <span className="mt-2 flex items-center gap-1 text-sm font-medium">{sel === o.id && <Check className="h-3.5 w-3.5 text-primary" />}{o.nome}{idEmUso === o.id && <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-normal text-secondary-foreground">Em uso</span>}</span>
              <span className="block text-xs text-muted-foreground">{o.descricao}</span>
              {!o.cabe && <span className="mt-1 block text-xs text-destructive">O título não cabe nesta capa. Encurta-o na narrativa.</span>}
              {o.cabe && o.aviso && <span className="mt-1 block text-xs text-muted-foreground">{o.aviso}</span>}
            </button>
            {o.id === "foto" && projectId && (
              <div className="mt-2">
                <SugestaoFotos projectId={projectId} termo={titulo.split(/\s+/).filter((w) => w.length > 4).slice(0, 3).join(" ")} rotulo={foto ? "Trocar fotografia" : "Escolher fotografia para esta capa"}
                  onAceitar={(r) => { setFoto(r); setSel("foto"); }} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!escolhida} onClick={() => { if (escolhida) { onAplicar(aplicarCapa(pacote, variante, escolhida, escolhida.id === "foto" && foto ? foto.asset : undefined)); setSel(null); } }}>Escolher esta capa</Button>
        <span className="self-center text-xs text-muted-foreground">Fica guardada como nova versão; podes desfazer ou mudar de capa mais tarde.</span>
      </div>
    </section>
  );
}
