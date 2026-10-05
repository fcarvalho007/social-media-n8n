import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarImagens } from "@/features/editor-grafico/desenho";
import { cn } from "@/lib/utils";
import { PARES_FONTES, transbordos, type Medidor, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarEstilo, ESTILOS, type Estilo, type Paleta } from "../../../supabase/functions/_shared/motor/estilos";

interface Props {
  pacote: PacoteProva;
  medidor: Medidor;
  /** Replaces both variants (text untouched); the page autosaves as a new composition version. */
  onAplicar: (p: PacoteProva) => void;
}

const NOME_COR: Record<keyof Paleta, string> = { fundo: "Fundo", fundoCapa: "Fundo da capa", titulo: "Títulos", texto: "Texto", destaque: "Destaque", discreto: "Números e notas" };

function estilizar(p: PacoteProva, paleta: Paleta, par: string, manuais: boolean): { pacote: PacoteProva; manuais: number } {
  const A = aplicarEstilo(p.variantes.A, paleta, par, manuais);
  const B = aplicarEstilo(p.variantes.B, paleta, par, manuais);
  return { pacote: { ...p, variantes: { A: A.doc, B: B.doc } }, manuais: A.manuais + B.manuais };
}

/** Design step: pick one of six styles, adjust palette and font pair, apply explicitly. Never opens with changes. */
export function PassoDesign({ pacote, medidor, onAplicar }: Props) {
  const [escolha, setEscolha] = useState<Estilo>(ESTILOS[0]);
  const [paleta, setPaleta] = useState<Paleta>(ESTILOS[0].paleta);
  const [par, setPar] = useState(ESTILOS[0].par);
  const [manuais, setManuais] = useState(false);
  const [variante, setVariante] = useState<Variante>("A");
  const [confirmar, setConfirmar] = useState(false);
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => { let vivo = true; carregarImagens(pacote).then((i) => vivo && setImagens(i)).catch(() => undefined); return () => { vivo = false; }; }, [pacote]);

  const escolher = (e: Estilo) => { setEscolha(e); setPaleta(e.paleta); setPar(e.par); };
  const previa = useMemo(() => estilizar(pacote, paleta, par, manuais), [pacote, paleta, par, manuais]);
  const miniaturas = useMemo(() => ESTILOS.map((e) => ({ e, p: estilizar(pacote, e.paleta, e.par, false).pacote })), [pacote]);
  const novos = useMemo(() => {
    const antes = new Set((["A", "B"] as const).flatMap((v) => transbordos(pacote, v, medidor).map((t) => `${v}${t.pagina}`)));
    return (["A", "B"] as const).flatMap((v) => transbordos(previa.pacote, v, medidor).filter((t) => !antes.has(`${v}${t.pagina}`)).map((t) => `${v} p${t.pagina + 1}`));
  }, [pacote, previa, medidor]);
  const paginas = previa.pacote.variantes[variante].paginas;

  return (
    <section className="mc-entrar space-y-6" aria-labelledby="t-design">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="t-design" className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-xs text-muted-foreground">O texto não muda. Nada é aplicado até carregares em «Aplicar estilo».</p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Estilos">
        {miniaturas.map(({ e, p }) => (
          <li key={e.id}>
            <button type="button" onClick={() => escolher(e)} aria-pressed={escolha.id === e.id}
              className={cn("mc-trans block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", escolha.id === e.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
              <span className="block overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={p} variante="A" indice={0} medidor={medidor} imagens={imagens} escala={140 / 1080} /></span>
              <span className="mt-2 flex items-center gap-1 text-sm font-medium">{escolha.id === e.id && <Check className="h-3.5 w-3.5 text-primary" />}{e.nome}</span>
              <span className="block text-xs text-muted-foreground">{e.descricao}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {(["A", "B"] as const).map((v) => <Button key={v} variant={variante === v ? "secondary" : "ghost"} className="h-11" onClick={() => setVariante(v)}>Variante {v}</Button>)}
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Pré-visualização">
            {paginas.map((pg, i) => (
              <li key={pg.id} className="overflow-hidden rounded-[var(--mc-r-sm)] border border-border">
                <PaginaCanvas pacote={previa.pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={200 / 1080} />
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipografia</legend>
            <div className="grid gap-2">
              {PARES_FONTES.map((f) => (
                <button key={f.id} type="button" onClick={() => setPar(f.id)} aria-pressed={par === f.id}
                  className={cn("mc-trans flex min-h-11 items-center justify-between rounded-[var(--mc-r-md)] border px-3 text-left text-sm", par === f.id ? "border-primary" : "border-input hover:border-muted-foreground")}>
                  <span>{f.nome}</span>{f.id === "montserrat-inter" && <span className="text-xs text-muted-foreground">predefinido</span>}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Paleta</legend>
            {(Object.keys(NOME_COR) as (keyof Paleta)[]).map((k) => (
              <label key={k} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                <span>{NOME_COR[k]}</span>
                <input type="color" value={paleta[k]} onChange={(e) => setPaleta((p) => ({ ...p, [k]: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1" aria-label={`Cor: ${NOME_COR[k]}`} />
              </label>
            ))}
          </fieldset>
          {previa.manuais > 0 || manuais ? (
            <div className="flex items-start gap-2">
              <Checkbox id="manuais" checked={manuais} onCheckedChange={(v) => setManuais(v === true)} className="mt-0.5" />
              <Label htmlFor="manuais" className="text-sm font-normal">Recolorir também as {manuais ? "" : `${previa.manuais} `}camadas que acrescentaste à mão</Label>
            </div>
          ) : null}
          <Button className="h-11 w-full" onClick={() => setConfirmar(true)}>Aplicar estilo</Button>
        </div>
      </div>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="mc-estudio">
          <DialogHeader>
            <DialogTitle>Aplicar «{escolha.nome}»?</DialogTitle>
            <DialogDescription>Muda cores e tipos de letra nas variantes A e B e cria uma nova versão da composição. O texto não muda e as versões anteriores ficam guardadas.</DialogDescription>
          </DialogHeader>
          {novos.length > 0 && <p role="alert" className="text-sm text-destructive">Com estas letras, o texto deixa de caber em: {novos.join(", ")}. Terás de o ajustar antes de aprovar (o tamanho nunca é reduzido sozinho).</p>}
          {!manuais && previa.manuais > 0 && <p className="text-sm text-muted-foreground">{previa.manuais} camada(s) acrescentada(s) à mão mantêm as cores atuais.</p>}
          <DialogFooter>
            <Button variant="ghost" className="h-11" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button className="h-11" onClick={() => { onAplicar(previa.pacote); setConfirmar(false); }}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
