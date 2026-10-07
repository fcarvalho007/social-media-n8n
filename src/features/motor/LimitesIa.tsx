import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirOrcamento, lerOrcamento, lerUsoDetalhe, MODELO_IA_NOME, type OrcamentoIa, type UsoDetalhe } from "@/services/motor";

/** Per-project AI call limits for the content engine. Counts only; no monetary cap is promised. */
export function LimitesIa({ projectId, onAlterado }: { projectId: string; onAlterado?: (o: OrcamentoIa) => void }) {
  const [o, setO] = useState<OrcamentoIa | null>(null);
  const [dia, setDia] = useState("0");
  const [trab, setTrab] = useState("2");
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [uso, setUso] = useState<UsoDetalhe | null>(null);

  const carregar = useCallback(() => {
    lerUsoDetalhe(projectId).then(setUso).catch(() => setUso(null));
    lerOrcamento(projectId).then((r) => { setO(r); setDia(String(r.maxDia)); setTrab(String(r.maxTrabalho)); onAlterado?.(r); }).catch((e: Error) => setMsg(e.message));
  }, [projectId, onAlterado]);
  useEffect(() => { setO(null); setMsg(null); carregar(); }, [carregar]);

  const gravar = async (d: number, t: number) => {
    setAGravar(true); setMsg(null);
    try { await definirOrcamento(projectId, d, t); setAberto(false); carregar(); }
    catch (e) { setMsg((e as Error).message); }
    finally { setAGravar(false); }
  };

  if (!o) return <p className="text-xs text-muted-foreground">{msg ?? "A ler limites da IA…"}</p>;
  const ligada = o.maxDia > 0;
  const restantes = Math.max(0, o.maxDia - o.usadosHoje);
  return (
    <section className="rounded-lg border border-border bg-card p-3 text-sm" aria-label="Limites da IA">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <strong className="font-medium">DeepSeek Flash · controlo de custos</strong>
        <span className="text-muted-foreground">
          {ligada ? `Hoje: ${o.usadosHoje} de ${o.maxDia} pedidos (${restantes} disponíveis)` : "IA desligada neste projeto — os carrosséis são feitos sem IA."}
        </span>
        <div className="ml-auto flex gap-2">
          {!ligada && <Button size="sm" className="h-11 sm:h-8" disabled={aGravar} onClick={() => gravar(10, 2)}>Ligar (10 por dia)</Button>}
          <Button size="sm" variant="outline" className="h-11 sm:h-8" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>Detalhes</Button>
        </div>
      </div>
      {aberto && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {uso && <p className="text-xs">Hoje, por ação: geração {uso.geracao} · correção {uso.reparacao} · tradução {uso.traducao}. Limite interno: {o.maxDia} por dia no projeto e até {o.maxTrabalho} por versão (incluindo correção). A comparação inicial Editorial/PAS reserva 2 pedidos. Escolher uma versão ou reutilizar conteúdo guardado não gasta pedidos.</p>}
          <p className="text-xs text-muted-foreground">
            Fornecedor e modelo: {MODELO_IA_NOME}. Estes limites são da própria app, para controlar custos; não são créditos da Lovable. Cada pedido é cobrado pela DeepSeek à conta associada à chave do servidor, e o valor exato só aparece nessa conta, por isso aqui contam-se pedidos e não euros.
            Contam todos os pedidos de texto do motor: gerar um carrossel, cada proposta de estrutura (reformulação) e a correção automática de uma resposta inválida e cada tradução de fonte. Cada trabalho usa 1 pedido, ou 2 com correção. Um pedido com resultado desconhecido conta e não é repetido sozinho. 0 por dia desliga a IA.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1"><Label htmlFor="lim-dia">Pedidos por dia (0–10)</Label><Input id="lim-dia" type="number" min={0} max={10} className="h-11 w-28 sm:h-9" value={dia} onChange={(e) => setDia(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lim-trab">Por carrossel (1–2)</Label><Input id="lim-trab" type="number" min={1} max={2} className="h-11 w-28 sm:h-9" value={trab} onChange={(e) => setTrab(e.target.value)} /></div>
            <Button className="h-11 sm:h-9" disabled={aGravar} onClick={() => {
              const d = Number(dia), t = Number(trab);
              if (!Number.isInteger(d) || d < 0 || d > 10 || !Number.isInteger(t) || t < 1 || t > 2) { setMsg("Usa 0 a 10 por dia e 1 ou 2 por ação."); return; }
              gravar(d, t);
            }}>Gravar limites</Button>
          </div>
        </div>
      )}
      {msg && <p role="alert" className="mt-2 text-xs text-destructive">{msg}</p>}
    </section>
  );
}
