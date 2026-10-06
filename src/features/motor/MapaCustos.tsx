import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { kieConfig, type KieConfig } from "@/services/motor";
import { CUSTOS_IA, GRATUITOS, formatarCusto } from "./custosIa";

/** Cost map: every paid AI action, its provider, estimated price and the project's daily limit. */
export function MapaCustos({ projectId }: { projectId?: string }) {
  const [cfg, setCfg] = useState<KieConfig | null>(null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => { if (aberto && projectId && !cfg) kieConfig(projectId).then(setCfg).catch(() => undefined); }, [aberto, projectId, cfg]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-11 lg:h-9" title="Mapa de custos"><Coins className="h-4 w-4 lg:mr-1.5" /><span className="hidden lg:inline">Custos</span></Button>
      </PopoverTrigger>
      <PopoverContent className="mc-estudio w-80 text-sm" align="end">
        <p className="mb-1 font-medium">Mapa de custos</p>
        <p className="mb-2 text-xs text-muted-foreground">Só estas ações gastam dinheiro, e só quando clicas no botão respetivo. Valores estimados por pedido; o valor exato aparece na conta do fornecedor.</p>
        <ul className="space-y-2 text-xs">
          {CUSTOS_IA.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2">
              <span><span className="font-medium">{c.nome}</span><br /><span className="text-muted-foreground">{c.fornecedor}</span></span>
              <span className="shrink-0 tabular-nums">{formatarCusto(c.euros)} <span className="text-muted-foreground">{c.unidade}</span></span>
            </li>
          ))}
        </ul>
        {cfg && <p className="mt-2 text-xs text-muted-foreground">Imagens IA: limite de {cfg.max_dia} por dia neste projeto.{cfg.configurada ? "" : " Serviço de imagens não configurado."}</p>}
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 text-xs font-medium">Sem custo</p>
          <p className="text-xs text-muted-foreground">{GRATUITOS.join(" · ")}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
