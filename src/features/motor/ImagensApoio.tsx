import { useState } from "react";
import { ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACEITAR_CARREGAR, carregarFicheiro } from "@/features/editor-grafico/carregar";
import { interpretarImagem } from "@/services/motor";
import { MAX_DESCRICAO_APOIO, MAX_IMAGENS_APOIO, type ImagemApoio } from "./fonteComImagens";

interface Props { projectId: string; imagens: ImagemApoio[]; onMudar: (v: ImagemApoio[]) => void; desativado?: boolean }

/** Support images: stored as project assets (also available in Design); descriptions feed the source. */
export function ImagensApoio({ projectId, imagens, onMudar, desativado }: Props) {
  const [aCarregar, setACarregar] = useState(false);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [aInterpretar, setAInterpretar] = useState<string | null>(null);
  const cheio = imagens.length >= MAX_IMAGENS_APOIO;

  async function carregar(fs: FileList | null) {
    if (!fs?.length || !projectId) return;
    setACarregar(true);
    let atual = imagens;
    try {
      for (const f of Array.from(fs).slice(0, MAX_IMAGENS_APOIO - atual.length)) {
        try {
          const r = await carregarFicheiro(projectId, f);
          if (atual.some((i) => i.assetId === r.asset.id)) continue;
          setMiniaturas((m) => ({ ...m, [r.asset.id]: URL.createObjectURL(f) }));
          atual = [...atual, { assetId: r.asset.id, nome: f.name.replace(/\.[^.]+$/, "").slice(0, 60), descricao: "" }];
          onMudar(atual);
        } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
      }
    } finally { setACarregar(false); }
  }
  const mudar = (id: string, descricao: string) => onMudar(imagens.map((i) => (i.assetId === id ? { ...i, descricao } : i)));
  const remover = (id: string) => { onMudar(imagens.filter((i) => i.assetId !== id)); setConfirmar(null); };

  async function interpretar(i: ImagemApoio) {
    setConfirmar(null); setAInterpretar(i.assetId);
    try {
      const r = await interpretarImagem(projectId, i.assetId);
      // Proposal only: placed in the editable field; the person reviews before continuing.
      mudar(i.assetId, i.descricao.trim() ? `${i.descricao.trim()}\n\n${r.descricao}` : r.descricao);
      toast.success("Descrição proposta. Revê-a antes de continuar.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setAInterpretar(null); }
  }

  return (
    <section aria-labelledby="t-apoio" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 id="t-apoio" className="mb-1 text-sm font-semibold">Imagens de apoio <span className="font-normal text-muted-foreground">(opcional)</span></h2>
      <p className="mb-4 text-xs text-muted-foreground">Gráficos ou tabelas que completam o texto. O que escreveres sobre cada imagem entra na fonte como um parágrafo §. As imagens ficam também disponíveis no passo Design.</p>

      <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring ${cheio || desativado ? "pointer-events-none opacity-50" : ""}`}>
        {aCarregar ? <Loader2 className="mb-2 h-6 w-6 text-primary motion-safe:animate-spin" aria-hidden /> : <ImagePlus className="mb-2 h-6 w-6 text-primary" aria-hidden />}
        <span className="text-sm font-semibold">{aCarregar ? "A carregar…" : cheio ? `Máximo de ${MAX_IMAGENS_APOIO} imagens` : "Carregar gráficos ou tabelas"}</span>
        <span className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP · até 10 MB</span>
        <input type="file" accept={ACEITAR_CARREGAR} multiple className="sr-only" disabled={cheio || aCarregar || desativado} onChange={(e) => { carregar(e.target.files); e.target.value = ""; }} />
      </label>

      {imagens.length > 0 && (
        <ul className="mt-4 space-y-4">
          {imagens.map((i, k) => (
            <li key={i.assetId} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-3">
                {miniaturas[i.assetId]
                  ? <img src={miniaturas[i.assetId]} alt="" className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" />
                  : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground">#{k + 1}</span>}
                <p className="min-w-0 flex-1 truncate text-sm font-medium">Imagem {k + 1} · {i.nome}</p>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Retirar a imagem ${k + 1} da fonte`} onClick={() => remover(i.assetId)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Label htmlFor={`apoio-${i.assetId}`} className="text-xs">O que mostra esta imagem?</Label>
              <Textarea id={`apoio-${i.assetId}`} rows={3} maxLength={MAX_DESCRICAO_APOIO} className="mt-1 bg-card text-sm" value={i.descricao}
                onChange={(e) => mudar(i.assetId, e.target.value)} placeholder="Ex.: Vendas 2024 por trimestre — T1 120, T2 140, T3 135, T4 170 (milhares de €)." />
              {!i.descricao.trim() && <p className="mt-1 text-xs text-muted-foreground">Sem descrição, esta imagem não entra na fonte.</p>}
              <div className="mt-2">
                {confirmar === i.assetId ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-xs" role="group" aria-label="Confirmar pedido pago">
                    <span className="flex-1">Envia a imagem à Kie (Gemini 3 Flash). Custa 1 pedido pago, cobrado por tokens na tabela da Kie, e não é repetido automaticamente.</span>
                    <Button variant="ghost" className="h-11" onClick={() => setConfirmar(null)}>Cancelar</Button>
                    <Button className="h-11" onClick={() => interpretar(i)}>Confirmar</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="h-11 w-full" disabled={!!aInterpretar || desativado} onClick={() => setConfirmar(i.assetId)}>
                    {aInterpretar === i.assetId ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {aInterpretar === i.assetId ? "A interpretar…" : "Interpretar com IA · 1 pedido pago"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
