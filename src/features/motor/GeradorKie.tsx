import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { kieConfig, kieEstado, kieGerar, type KieConfig } from "@/services/motor";

const CHAVE = (p: string) => `mc-kie:${p}`;

/** Human-click-only Kie generation. Missing key shows «Configuração necessária»; never simulates success. */
export function GeradorKie({ projectId, usar, ocupado, promptInicial }: { projectId: string; usar: (chave: string, nome: string, obter: () => Promise<string>) => void; ocupado: boolean; promptInicial?: string }) {
  const [cfg, setCfg] = useState<KieConfig | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(promptInicial ?? "");
  const [confirmar, setConfirmar] = useState(false);
  const [tarefas, setTarefas] = useState<string[]>(() => { try { const v = localStorage.getItem(CHAVE(projectId)); return v ? (v.startsWith("[") ? JSON.parse(v) as string[] : [v]) : []; } catch { return []; } });
  const [estado, setEstado] = useState<string | null>(null);
  const [modeloId, setModeloId] = useState("");
  const [proporcao, setProporcao] = useState("4:5");
  const [tamanho, setTamanho] = useState("2K");
  const [quantidade, setQuantidade] = useState(1);
  const [profissional, setProfissional] = useState(true);
  const fixar = (ts: string[]) => { setTarefas(ts); try { if (ts.length) localStorage.setItem(CHAVE(projectId), JSON.stringify(ts)); else localStorage.removeItem(CHAVE(projectId)); } catch { /* só nesta sessão */ } };

  useEffect(() => { kieConfig(projectId).then((c) => { setCfg(c); const m = c.modelos?.[0]; if (m) { setModeloId(m.id); setProporcao(m.proporcoes.includes("4:5") ? "4:5" : m.proporcoes[0]); setTamanho(m.tamanhos.at(-1) ?? "2K"); } }).catch((e: Error) => setErro(e.message)); }, [projectId]);
  const modelo = cfg?.modelos?.find((m) => m.id === modeloId);

  const consultar = useCallback(async () => {
    if (!tarefas.length) return;
    try {
      const rs = await Promise.all(tarefas.map(async (t) => ({ t, r: await kieEstado(projectId, t) })));
      const pendentes: string[] = [];
      for (const { t, r } of rs) {
        if (r.estado === "concluida" && r.asset_id) usar(`kie-${t}`, "Imagem IA", async () => String(r.asset_id));
        else if (r.estado === "falhou") setErro(`O serviço não gerou uma imagem: ${r.erro ?? "sem detalhe"}.`);
        else if (r.estado === "desconhecido") setErro("Resultado desconhecido: o pedido não é repetido automaticamente.");
        else pendentes.push(t);
      }
      fixar(pendentes); setEstado(pendentes.length ? "criada" : "concluida");
    } catch (e) { setErro((e as Error).message); }
  }, [projectId, tarefas, usar]);
  useEffect(() => {
    if (!tarefas.length) return;
    consultar();
    const t = setInterval(consultar, 5000);
    return () => clearInterval(t);
  }, [tarefas.length, consultar]);

  const gerar = async () => {
    setErro(null); setConfirmar(false);
    try { const r = await kieGerar(projectId, prompt, { modelo_id: modeloId, proporcao, tamanho, quantidade, profissional }); fixar(r.tarefas.map((t) => t.tarefa)); setEstado("criada"); if (r.aviso) setErro(r.aviso); }
    catch (e) { setErro((e as Error).message); }
  };

  return (
    <section aria-labelledby="t-kie" className="space-y-3 border-t border-border pt-3">
      <h3 id="t-kie" className="text-sm font-medium">Gerar imagem com IA</h3>
      {cfg && !cfg.configurada && <p className="text-sm text-muted-foreground"><strong>Configuração necessária.</strong> Falta uma ligação a um serviço de imagens. Vê o ecrã Ligações.</p>}
      {cfg?.configurada && (
        <>
          <Label htmlFor="kie-prompt" className="sr-only">Descrição da imagem</Label>
           <Textarea id="kie-prompt" rows={4} maxLength={2000} value={prompt} disabled={tarefas.length > 0} onChange={(e) => setPrompt(e.target.value)} placeholder="Descreve o assunto, o ambiente, a composição e a luz" />
           {cfg.modelos?.length > 0 && <div className="space-y-2">
             <Label>Modelo</Label><Select value={modeloId} onValueChange={(id) => { setModeloId(id); const m = cfg.modelos.find((x) => x.id === id); if (m) { setProporcao(m.proporcoes.includes("4:5") ? "4:5" : m.proporcoes[0]); setTamanho(m.tamanhos.at(-1) ?? "2K"); } }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cfg.modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} · {m.fornecedor}</SelectItem>)}</SelectContent></Select>
             <div className="grid grid-cols-3 gap-2"><div><Label>Formato</Label><Select value={proporcao} onValueChange={setProporcao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{modelo?.proporcoes.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Dimensão</Label><Select value={tamanho} onValueChange={setTamanho}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{modelo?.tamanhos.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Versões</Label><Select value={String(quantidade)} onValueChange={(v) => setQuantidade(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map((x) => <SelectItem key={x} value={String(x)}>{x}</SelectItem>)}</SelectContent></Select></div></div>
             <label className="flex items-start gap-2 rounded-[var(--mc-r-md)] border border-border p-2 text-xs"><Checkbox checked={profissional} onCheckedChange={(v) => setProfissional(v === true)} /><span><strong>Modo profissional</strong><br /><span className="text-muted-foreground">Estrutura assunto, cenário, composição, luz, estilo e preservação sem fazer outro pedido de IA.</span></span></label>
           </div>}
           <p className="text-xs text-muted-foreground">{modelo ? `${modelo.nome} · custo ${modelo.custo_origem}: ${modelo.moeda === "EUR" ? "€" : "US$"} ${(modelo.custo * quantidade).toFixed(4).replace(".", ",")} no total (${quantidade} × ${modelo.custo.toFixed(4).replace(".", ",")}).` : "A carregar modelos disponíveis…"} Máximo de {cfg.max_dia} pedidos por dia. O valor real é o cobrado pelo fornecedor.</p>
           {tarefas.length > 0
             ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />{estado === "desconhecido" ? "Resultado desconhecido." : `A gerar ${tarefas.length} ${tarefas.length === 1 ? "imagem" : "imagens"}… podes fechar e voltar.`}{estado === "desconhecido" && <Button variant="ghost" className="h-9" onClick={() => fixar([])}>Fechar</Button>}</p>
            : confirmar
               ? <div className="rounded-[var(--mc-r-md)] border border-border p-2"><p className="mb-2 text-xs">Confirma {quantidade} {quantidade === 1 ? "pedido pago" : "pedidos pagos"} com as opções acima.</p><div className="flex flex-wrap gap-2"><Button className="h-11" disabled={ocupado || !modelo} onClick={gerar}>Confirmar e gerar</Button><Button variant="ghost" className="h-11" onClick={() => setConfirmar(false)}>Cancelar</Button></div></div>
               : <Button variant="outline" className="h-11" disabled={ocupado || !modelo || prompt.trim().length < 5} onClick={() => setConfirmar(true)}>Rever custo e gerar</Button>}
        </>
      )}
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    </section>
  );
}
