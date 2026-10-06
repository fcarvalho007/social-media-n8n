import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [modo, setModo] = useState<"manter" | "explorar">("manter");
  const [fonte, setFonte] = useState<"auto" | "sem_novas">("auto");
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const gerar = (r: number) => {
    setRonda(r);
    setSel(null);
    setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo, imagens: fonte, ronda: r, incluirIA: false }));
  };
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
      {c && <span className="text-[11px] leading-tight text-muted-foreground">{ficha(c)}</span>}
      {c && <span className="text-[11px] leading-tight text-muted-foreground">{c.reason}</span>}
    </div>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[1400px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redesenhar este slide</DialogTitle>
          <DialogDescription>Mantém o conteúdo e cria 5 composições alternativas, sem custo. Depois de aplicar, escolhe a imagem no painel Imagem: biblioteca, fotos, carregar, IA ou nenhuma.</DialogDescription>
        </DialogHeader>
        {!res ? (
          <div className="space-y-3">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronDown className="h-3.5 w-3.5" />Opções avançadas</CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Direção</p>
                  <RadioGroup value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-manter" value="manter" /><Label htmlFor="rd-manter" className="text-sm font-normal">Manter direção visual atual</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-explorar" value="explorar" /><Label htmlFor="rd-explorar" className="text-sm font-normal">Explorar livremente</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Imagens</p>
                  <RadioGroup value={fonte} onValueChange={(v) => setFonte(v as typeof fonte)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-auto" value="auto" /><Label htmlFor="ri-auto" className="text-sm font-normal">Automático (imagens já existentes)</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-sem" value="sem_novas" /><Label htmlFor="ri-sem" className="text-sm font-normal">Sem novas imagens</Label></div>
                  </RadioGroup>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <p className="text-xs text-muted-foreground">O texto, os números e o papel da página não mudam. Nenhum pedido pago é feito ao gerar as propostas.</p>
            <Button onClick={() => gerar(0)}><Sparkles className="mr-1.5 h-4 w-4" />Gerar 5 propostas · sem custo</Button>
          </div>
        ) : (
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                {cartao(pacote, "Original", !sel, () => setSel(null))}
                {res.candidatos.map((c, i) => cartao(aplicarCandidato(pacote, variante, indice, c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c))}
              </div>
              {res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => gerar(ronda + 1)}>Gerar mais 5 · sem custo</Button>
                <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
