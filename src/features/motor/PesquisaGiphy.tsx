import { useState } from "react";
import { Film, Loader2, Search, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { giphyPesquisar, giphyUsar, type ItemGiphy, type TipoGiphy } from "@/services/motor";

export function PesquisaGiphy({ projectId, usar, ocupado }: { projectId: string; usar: (chave: string, nome: string, obter: () => Promise<string>) => Promise<void>; ocupado: boolean }) {
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<ItemGiphy[]>([]);
  const [tipo, setTipo] = useState<TipoGiphy>("stickers");
  const [aPesquisar, setAPesquisar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pesquisar = async () => {
    if (termo.trim().length < 2) return;
    setAPesquisar(true); setErro(null);
    try { setItens((await giphyPesquisar(projectId, termo.trim(), tipo)).itens); } catch (e) { setErro((e as Error).message); } finally { setAPesquisar(false); }
  };
  const escolher = (s: ItemGiphy) => usar(`giphy:${s.id}`, s.titulo || "GIPHY", async () => {
    const r = await giphyUsar(projectId, s, s.duracao_ms ?? 5000);
    return r.asset.id;
  });
  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-1 rounded-[var(--mc-r-md)] bg-muted p-1" role="tablist" aria-label="Tipo de conteúdo GIPHY">
      {([['gifs', 'GIFs'], ['stickers', 'Stickers'], ['clips', 'Clips']] as const).map(([id, nome]) => <Button key={id} type="button" size="sm" variant={tipo === id ? "secondary" : "ghost"} role="tab" aria-selected={tipo === id} onClick={() => { setTipo(id); setItens([]); setErro(null); }} className="h-9 px-2">{nome}</Button>)}
    </div>
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void pesquisar(); }}>
      <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Procurar ${tipo === "gifs" ? "GIFs" : tipo === "clips" ? "clips" : "stickers"}`} aria-label="Procurar no GIPHY" />
      <Button type="submit" size="icon" variant="outline" disabled={aPesquisar || termo.trim().length < 2} aria-label="Pesquisar"><Search className="h-4 w-4" /></Button>
    </form>
    {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}
    {aPesquisar && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A pesquisar…</p>}
    {!aPesquisar && itens.length === 0 && <p className="flex items-center gap-2 text-xs text-muted-foreground">{tipo === "stickers" ? <Sticker className="h-4 w-4" /> : <Film className="h-4 w-4" />}Escreve pelo menos duas letras e pesquisa. Clips dependem do acesso da conta GIPHY.</p>}
    <ul className="grid grid-cols-3 gap-2" aria-label="Resultados GIPHY">
      {itens.map((s) => <li key={s.id}><button type="button" disabled={ocupado} onClick={() => void escolher(s)} className="relative aspect-square w-full overflow-hidden rounded-[var(--mc-r-sm)] border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" aria-label={`Inserir ${s.titulo}`}><img src={s.preview} alt="" loading="lazy" className="h-full w-full object-contain" /></button></li>)}
    </ul>
    {itens.length > 0 && <p className="text-[11px] text-muted-foreground">Powered by GIPHY</p>}
  </div>;
}