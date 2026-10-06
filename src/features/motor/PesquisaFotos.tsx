import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fotosPesquisar, fotoUsar, type FotoStock } from "@/services/motor";

interface Props {
  projectId: string;
  ocupado: boolean;
  aUsar: string | null;
  usar: (chave: string, nome: string, obter: () => Promise<string>) => void | Promise<void>;
  termoInicial?: string;
  /** Narrow sidebar: 2 columns. */
  compacto?: boolean;
}

/** Free search in Pexels and Unsplash at once. One request per click, never retried; the chosen photo is copied into the project. */
export function PesquisaFotos({ projectId, ocupado, aUsar, usar, termoInicial, compacto }: Props) {
  const [termo, setTermo] = useState(termoInicial ?? "");
  const [fotos, setFotos] = useState<FotoStock[] | null>(null);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);

  const pesquisar = async (p: number) => {
    if (termo.trim().length < 2) return;
    setAPesquisar(true); setErro(null);
    try {
      const r = await fotosPesquisar(projectId, termo, p);
      setFotos((a) => (p === 1 ? r.fotos : [...(a ?? []), ...r.fotos]));
      setPagina(p); setMais(r.mais); setAvisos(r.avisos ?? []);
    } catch (e) { setErro((e as Error).message); } finally { setAPesquisar(false); }
  };
  const submeter = (e: FormEvent) => { e.preventDefault(); void pesquisar(1); };

  return (
    <section className="space-y-2" aria-label="Fotografias Pexels e Unsplash">
      <form onSubmit={submeter} className="flex gap-2">
        <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: reunião, escritório" aria-label="Pesquisar fotografias" className="h-10" maxLength={100} />
        <Button type="submit" variant="outline" className="h-10 shrink-0 px-3" disabled={aPesquisar || termo.trim().length < 2} aria-label="Pesquisar">
          {aPesquisar ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">Pesquisa no Pexels e na Unsplash ao mesmo tempo · gratuito.</p>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {avisos.map((a) => <p key={a} className="text-xs text-muted-foreground" role="status">{a}</p>)}
      {fotos && fotos.length === 0 && !aPesquisar && <p className="text-sm text-muted-foreground">Sem resultados. Experimenta outras palavras (em inglês costuma dar mais resultados).</p>}
      {fotos && fotos.length > 0 && (
        <ul className={cn("grid gap-2", compacto ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")} aria-label="Resultados">
          {fotos.map((f) => {
            const chave = `${f.fonte}-${f.id}`;
            const nome = f.fonte === "pexels" ? "Pexels" : "Unsplash";
            return (
              <li key={chave}>
                <button type="button" disabled={ocupado} onClick={() => usar(chave, `Foto: ${f.autor} / ${nome}`, async () => (await fotoUsar(projectId, f)).asset.id)}
                  className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--mc-r-md)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  aria-label={`Usar foto de ${f.autor} (${nome})${f.alt ? `: ${f.alt}` : ""}`}>
                  <img src={f.miniatura} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded-sm bg-background/90 px-1 py-0.5 text-[10px] font-medium">{nome}</span>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-background/90 px-1.5 py-0.5 text-left text-[11px]">{f.autor}</span>
                  {aUsar === chave && <span className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-5 w-5 motion-safe:animate-spin" /></span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {mais && <Button variant="ghost" className="h-10 w-full" disabled={aPesquisar} onClick={() => pesquisar(pagina + 1)}>Mais resultados</Button>}
      <p className="text-xs text-muted-foreground">Ao usar, guarda-se uma cópia com o crédito do fotógrafo. Fotos do <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline">Pexels</a> e da <a href="https://unsplash.com/?utm_source=hub_conteudo&utm_medium=referral" target="_blank" rel="noreferrer" className="underline">Unsplash</a>.</p>
    </section>
  );
}
