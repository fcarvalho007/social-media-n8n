import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { kieConfig, kieEstado, kieGerar, type KieConfig } from "@/services/motor";

const CHAVE = (p: string) => `mc-kie:${p}`;

/** Human-click-only Kie generation. Missing key shows «Configuração necessária»; never simulates success. */
export function GeradorKie({ projectId, usar, ocupado }: { projectId: string; usar: (chave: string, nome: string, obter: () => Promise<string>) => void; ocupado: boolean }) {
  const [cfg, setCfg] = useState<KieConfig | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [tarefa, setTarefa] = useState<string | null>(() => { try { return localStorage.getItem(CHAVE(projectId)); } catch { return null; } });
  const [estado, setEstado] = useState<string | null>(null);
  const fixar = (t: string | null) => { setTarefa(t); try { if (t) localStorage.setItem(CHAVE(projectId), t); else localStorage.removeItem(CHAVE(projectId)); } catch { /* só nesta sessão */ } };

  useEffect(() => { kieConfig(projectId).then(setCfg).catch((e: Error) => setErro(e.message)); }, [projectId]);

  const consultar = useCallback(async () => {
    if (!tarefa) return;
    try {
      const r = await kieEstado(projectId, tarefa);
      setEstado(r.estado);
      if (r.estado === "concluida" && r.asset_id) { const id = r.asset_id; fixar(null); usar(`kie-${tarefa}`, "Imagem Kie", async () => id); }
      if (r.estado === "falhou") setErro(`A Kie não gerou a imagem: ${r.erro ?? "sem detalhe"}.`);
      if (r.estado === "desconhecido") setErro("Resultado desconhecido: o pedido não é repetido automaticamente.");
    } catch (e) { setErro((e as Error).message); }
  }, [projectId, tarefa, usar]);
  useEffect(() => {
    if (!tarefa) return;
    consultar();
    const t = setInterval(consultar, 5000);
    return () => clearInterval(t);
  }, [tarefa, consultar]);

  const gerar = async () => {
    setErro(null); setConfirmar(false);
    try { const r = await kieGerar(projectId, prompt); fixar(r.tarefa); setEstado(r.estado); }
    catch (e) { setErro((e as Error).message); }
  };

  return (
    <section aria-labelledby="t-kie" className="space-y-2 border-t border-border pt-3">
      <h3 id="t-kie" className="text-sm font-medium">Gerar imagem limpa (Kie)</h3>
      {cfg && !cfg.configurada && <p className="text-sm text-muted-foreground"><strong>Configuração necessária.</strong> Falta a chave KIE_API_KEY. Vê o ecrã Ligações.</p>}
      {cfg?.configurada && (
        <>
          <Label htmlFor="kie-prompt" className="sr-only">Descrição da imagem</Label>
          <Textarea id="kie-prompt" rows={3} maxLength={2000} value={prompt} disabled={!!tarefa} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex.: secretária de madeira com luz da manhã, tons verdes suaves" />
          <p className="text-xs text-muted-foreground">Modelo {cfg.modelo} · {cfg.proporcao} recortado para 4:5 no editor · sem texto, logótipos nem marcas de água · até {cfg.max_dia} por dia. Preço: consulta kie.ai/pricing (esta app não verificou o valor).</p>
          {tarefa
            ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />{estado === "desconhecido" ? "Resultado desconhecido." : "A gerar na Kie… podes fechar e voltar."}{estado === "desconhecido" && <Button variant="ghost" className="h-9" onClick={() => fixar(null)}>Fechar</Button>}</p>
            : confirmar
              ? <div className="flex flex-wrap gap-2"><Button className="h-11" disabled={ocupado} onClick={gerar}>Confirmar e gerar (pago)</Button><Button variant="ghost" className="h-11" onClick={() => setConfirmar(false)}>Cancelar</Button></div>
              : <Button variant="outline" className="h-11" disabled={ocupado || prompt.trim().length < 5} onClick={() => setConfirmar(true)}>Gerar com Kie</Button>}
        </>
      )}
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    </section>
  );
}
