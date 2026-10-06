import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import type { SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { aplicarCandidato, redesenharPagina, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";

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
  /** Opens the existing AI image flow (asks for paid-request confirmation there). */
  onGerarIA?: () => void;
}

/** Composition exploration for one page. Nothing touches the document until "Aplicar esta versão". */
export function PainelRedesenhar({ aberto, onFechar, pacote, sistema, variante, indice, medidor, imagens, onAplicar, onGerarIA }: Props) {
  const [modo, setModo] = useState<"manter" | "explorar">("manter");
  const [fonte, setFonte] = useState<"auto" | "sem_novas" | "ia">("auto");
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const gerar = (r: number) => {
    setRonda(r);
    setSel(null);
    setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo, imagens: fonte === "ia" ? "auto" : fonte, ronda: r }));
  };
  const fechar = () => { setRes(null); setSel(null); onFechar(); };
  const vista = useMemo(() => (sel ? aplicarCandidato(pacote, variante, indice, sel) : pacote), [sel, pacote, variante, indice]);
  const mini = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, sub?: string) => (
    <button type="button" onClick={onClick} className={`space-y-1 rounded-md border p-1 text-left transition-colors ${ativo ? "border-primary" : "border-border hover:border-muted-foreground"}`}>
      <PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imagens} escala={0.12} />
      <span className="block text-xs font-medium">{rotulo}</span>
      {sub && <span className="block text-[11px] leading-tight text-muted-foreground">{sub}</span>}
    </button>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redesenhar este slide</DialogTitle>
          <DialogDescription>Mantém o conteúdo e cria 5 composições gráficas alternativas.</DialogDescription>
        </DialogHeader>
        {!res ? (
          <div className="space-y-3">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronDown className="h-3.5 w-3.5" />Opções avançadas</CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Direção</p>
                  <RadioGroup value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-manter" value="manter" /><Label htmlFor="rd-manter" className="text-sm font-normal">Manter direção visual actual</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-explorar" value="explorar" /><Label htmlFor="rd-explorar" className="text-sm font-normal">Explorar livremente</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Imagens</p>
                  <RadioGroup value={fonte} onValueChange={(v) => setFonte(v as typeof fonte)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-auto" value="auto" /><Label htmlFor="ri-auto" className="text-sm font-normal">Automático</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-sem" value="sem_novas" /><Label htmlFor="ri-sem" className="text-sm font-normal">Sem novas imagens</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-ia" value="ia" /><Label htmlFor="ri-ia" className="text-sm font-normal">Permitir imagem IA (pede confirmação de custo)</Label></div>
                  </RadioGroup>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <p className="text-xs text-muted-foreground">O texto, os números e o papel da página não mudam. Nenhuma imagem paga é gerada.</p>
            <Button onClick={() => gerar(0)}><Sparkles className="mr-1.5 h-4 w-4" />Gerar 5 propostas</Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imagens} escala={0.3} />
              {sel ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { onAplicar(vista, sel); fechar(); }}>Aplicar esta versão</Button>
                  <Button variant="outline" onClick={() => setSel(null)}>Voltar às propostas</Button>
                </div>
              ) : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {mini(pacote, "Original", !sel, () => setSel(null))}
                {res.candidatos.map((c, i) => mini(aplicarCandidato(pacote, variante, indice, c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c.reason))}
              </div>
              {res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}
              {res.sugerirIA && fonte === "ia" && onGerarIA && (
                <p className="text-xs">Este slide beneficiaria de uma imagem própria. <button type="button" className="underline" onClick={() => { fechar(); onGerarIA(); }}>Gerar imagem IA</button> (pede confirmação de pedido pago).</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => gerar(ronda + 1)}>Gerar mais 5</Button>
                <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
