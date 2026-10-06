import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import type { SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { aceitaImagemIA, aplicarCandidato, redesenharPagina, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";
import type { ComposicaoImagem } from "../../../supabase/functions/_shared/motor/imagem";

const NOME_MODO: Record<string, string> = { full_bleed: "Fundo total", hero: "Hero", split: "Dividida", contained: "Contida", background: "Fundo suave", none: "Sem imagem" };
const NOME_REGIAO: Record<string, string> = { left: "texto à esquerda", right: "texto à direita", top: "texto em cima", bottom: "texto em baixo", center: "texto ao centro" };

type Imagens = Parameters<typeof PaginaCanvas>[0]["imagens"];

interface Props {
  aberto: boolean;
  onFechar: () => void;
  pacote: PacoteProva;
  sistema: SistemaVisual;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  imagens: Imagens;
  onAplicar: (p: PacoteProva, c: CandidatoRedesign) => void;
  /** Kept for callers; image choice (incl. AI) happens in the slide Image panel after applying. */
  onGerarIA?: () => void;
  projectId?: string;
}

/** Composition exploration for one page. Free; no image requests. Nothing touches the document until "Aplicar esta versão". */
export function PainelRedesenhar({ aberto, onFechar, pacote, sistema, variante, indice, medidor, imagens, onAplicar }: Props) {
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const gerar = (r: number) => {
    setRonda(r);
    setSel(null);
    setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo: "manter", imagens: "auto", ronda: r, incluirIA: false }));
  };
  useEffect(() => {
    if (aberto) gerar(0);
    // The modal must refresh when reopened for another page/document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, pacote.id, variante, indice]);
  const fechar = () => { setRes(null); setSel(null); onFechar(); };
  const vista = useMemo(() => (sel ? aplicarCandidato(pacote, variante, indice, sel) : pacote), [sel, pacote, variante, indice]);
  const aplicar = (c: CandidatoRedesign) => { onAplicar(aplicarCandidato(pacote, variante, indice, c), c); fechar(); };
  const ficha = (c: CandidatoRedesign) => {
    const comp = (c.pagina.composicao ?? {}) as ComposicaoImagem;
    const temImg = aceitaImagemIA(c);
    return [temImg ? NOME_MODO[comp.modo ?? ""] ?? "Com imagem" : "Só tipografia", comp.regiao ? NOME_REGIAO[comp.regiao] : "", temImg ? "com espaço para imagem" : ""].filter(Boolean).join(" · ");
  };
  const cartao = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, c?: CandidatoRedesign) => (
    <div key={c?.id ?? "orig"} className={`flex min-w-0 flex-col gap-1.5 rounded-lg border p-2 transition-colors ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}>
      <button type="button" onClick={onClick} className="relative block overflow-hidden rounded-md text-left" aria-label={rotulo}>
        <PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imagens} escala={0.17} />
      </button>
      <span className="text-xs font-medium leading-tight">{rotulo}</span>
      {c && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] leading-tight text-muted-foreground">{ficha(c)}</span>{c.disruptiva && <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">Disruptiva</span>}</div>}
      {c && <span className="text-[11px] leading-tight text-muted-foreground">{c.reason}</span>}
    </div>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[1400px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher nova composição</DialogTitle>
          <DialogDescription>Escolhe uma de cinco formas de apresentar este slide. O conteúdo mantém-se e não é feito qualquer pedido pago.</DialogDescription>
        </DialogHeader>
        {res ? (
          <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
            <div className="space-y-2 lg:sticky lg:top-0 lg:self-start">
              <PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imagens} escala={0.36} />
              {sel ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{ficha(sel)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => aplicar(sel)}>Aplicar esta versão</Button>
                    <Button variant="ghost" onClick={() => setSel(null)}>Ver original</Button>
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {res.candidatos.map((c, i) => cartao(aplicarCandidato(pacote, variante, indice, c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c))}
              </div>
              {res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => gerar(ronda + 1)}><RefreshCw className="mr-1.5 h-4 w-4" />Gerar outras 5</Button>
                <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
              </div>
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground" role="status">A preparar cinco composições…</p>}
      </DialogContent>
    </Dialog>
  );
}
