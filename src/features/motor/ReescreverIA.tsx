import { useState } from "react";
import { Loader2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { reescreverTexto } from "@/services/motor";
import { CUSTO_ESTIMADO_EUR } from "../../../supabase/functions/_shared/motor/reescrever";

export interface ContextoReescrita { project_id: string; papel: string; tom: string; objetivo: string; vizinhos: string }

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 3 }).format(v);

/** Paid AI rewrite: asks first, shows 2 alternatives under the field, never replaces the text until «Usar esta». */
export function BotaoReescrever({ campo, valor, contexto, onUsar }: { campo: "titulo" | "texto"; valor: string; contexto: ContextoReescrita; onUsar: (t: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [aPedir, setAPedir] = useState(false);
  const [alt, setAlt] = useState<string[]>([]);
  const [nota, setNota] = useState<string | null>(null);
  const nome = campo === "titulo" ? "título" : "texto";

  const pedir = async () => {
    setAberto(false); setAPedir(true); setNota(null);
    try {
      const r = await reescreverTexto({ ...contexto, campo, texto: valor });
      setAlt(r.alternativas);
      if (!r.alternativas.length) setNota("A IA não devolveu propostas que mantivessem os factos. O texto ficou igual.");
      else if (r.descartadas > 0) setNota(`${r.descartadas} proposta(s) descartada(s) por alterarem números da fonte.`);
    } catch (e) { setNota((e as Error).message); }
    finally { setAPedir(false); }
  };

  return (
    <div className="space-y-2">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs" disabled={aPedir || !valor.trim()} aria-label={`Reescrever ${nome} com IA`}>
            {aPedir ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden /> : <Wand2 className="h-3.5 w-3.5" aria-hidden />}
            {alt.length ? "Outras 2" : "Reescrever com IA"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 text-sm">
          <p>Pedir 2 versões diferentes do {nome}. O texto atual não é apagado.</p>
          <p className="text-xs text-muted-foreground">Pedido pago · cerca de {eur(CUSTO_ESTIMADO_EUR)} · conta para o limite diário.</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button size="sm" onClick={pedir}>Pedir 2 versões</Button>
          </div>
        </PopoverContent>
      </Popover>
      {nota && <p role="status" className="text-xs text-muted-foreground">{nota}</p>}
      {alt.length > 0 && (
        <ul className="space-y-2" aria-label={`Propostas para o ${nome}`}>
          {alt.map((a, i) => (
            <li key={i} className="rounded-[var(--mc-r-md)] border border-dashed border-input bg-muted/30 p-3">
              <p className="text-sm leading-relaxed">{a}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="h-8" onClick={() => { onUsar(a); setAlt((x) => x.filter((_, j) => j !== i)); }}>Usar esta</Button>
                <Button size="sm" variant="ghost" className="h-8" aria-label="Descartar proposta" onClick={() => setAlt((x) => x.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
