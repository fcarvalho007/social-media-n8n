import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pexelsPesquisar, pexelsUsar, type FotoPexelsMotor } from "@/services/motor";

interface Props {
  projectId: string;
  ocupado: boolean;
  aUsar: string | null;
  usar: (chave: string, nome: string, obter: () => Promise<string>) => Promise<void>;
}

/** Free Pexels search. One request per click, never retried automatically; the chosen photo is copied into the project. */
export function PesquisaPexels({ projectId, ocupado, aUsar, usar }: Props) {
  const [termo, setTermo] = useState("");
  const [fotos, setFotos] = useState<FotoPexelsMotor[] | null>(null);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pesquisar = async (p: number) => {
    if (termo.trim().length < 2) return;
    setAPesquisar(true); setErro(null);
    try {
      const r = await pexelsPesquisar(projectId, termo, p);
      setFotos((a) => (p === 1 ? r.fotos : [...(a ?? []), ...r.fotos]));
      setPagina(p); setMais(r.mais);
    } catch (e) { setErro((e as Error).message); } finally { setAPesquisar(false); }
  };
  const submeter = (e: FormEvent) => { e.preventDefault(); void pesquisar(1); };

  return (
    <section className="space-y-2 border-t border-border pt-3" aria-labelledby="pexels-titulo">
      <h3 id="pexels-titulo" className="text-sm font-medium">Fotografias do Pexels <span className="font-normal text-muted-foreground">· gratuitas</span></h3>
      <form onSubmit={submeter} className="flex gap-2">
        <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: reunião de equipa, escritório" aria-label="Pesquisar no Pexels" className="h-11" maxLength={100} />
        <Button type="submit" variant="outline" className="h-11 shrink-0" disabled={aPesquisar || termo.trim().length < 2}>
          {aPesquisar ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <Search className="h-4 w-4" />}<span className="ml-1.5">Pesquisar</span>
        </Button>
      </form>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {fotos && fotos.length === 0 && !aPesquisar && <p className="text-sm text-muted-foreground">Sem resultados. Experimenta outras palavras (em inglês costuma dar mais resultados).</p>}
      {fotos && fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resultados do Pexels">
          {fotos.map((f) => {
            const chave = `pexels-${f.id}`;
            return (
              <li key={f.id}>
                <button type="button" disabled={ocupado} onClick={() => usar(chave, `Foto: ${f.autor} / Pexels`, async () => (await pexelsUsar(projectId, f)).asset.id)}
                  className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--mc-r-md)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  aria-label={`Usar foto de ${f.autor}${f.alt ? `: ${f.alt}` : ""}`}>
                  <img src={f.miniatura} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-background/90 px-1.5 py-0.5 text-left text-[11px]">{f.autor}</span>
                  {aUsar === chave && <span className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-5 w-5 motion-safe:animate-spin" /></span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {mais && <Button variant="ghost" className="h-11 w-full" disabled={aPesquisar} onClick={() => pesquisar(pagina + 1)}>Mais resultados</Button>}
      <p className="text-xs text-muted-foreground">Ao usar, guarda-se uma cópia e o crédito do fotógrafo. Fotos do <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline">Pexels</a>.</p>
    </section>
  );
}
