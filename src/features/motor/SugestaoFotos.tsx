// One-click free photo suggestions for the current slide (Pexels + Unsplash). One request per click;
// nothing is applied until "Usar" is pressed.
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fotosPesquisar, fotoUsar, lerAssets, type FotoStock } from "@/services/motor";
import type { Asset } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

interface Props {
  projectId: string;
  termo?: string;
  rotulo?: string;
  onAceitar: (r: { asset: Asset; nome: string }) => void;
}

export function SugestaoFotos({ projectId, termo: termoInicial, rotulo = "Sugerir 3 fotografias para este slide", onAceitar }: Props) {
  const [termo, setTermo] = useState(termoInicial ?? "");
  const [editar, setEditar] = useState(false);
  const [fotos, setFotos] = useState<FotoStock[] | null>(null);
  const [inicio, setInicio] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aUsar, setAUsar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const pesquisar = async (p: number, t = termo) => {
    if (t.trim().length < 2) { setEditar(true); return; }
    setAPesquisar(true); setErro(null);
    try {
      const r = await fotosPesquisar(projectId, t, p);
      setFotos((a) => (p === 1 ? r.fotos : [...(a ?? []), ...r.fotos])); setPagina(p); setMais(r.mais);
      if (p === 1) setInicio(0);
    } catch (e) { setErro(`${(e as Error).message} Podes usar «Fotos» no painel de imagens.`); } finally { setAPesquisar(false); }
  };
  const outras = () => {
    const prox = inicio + 3;
    if (fotos && prox < fotos.length) setInicio(prox); else if (mais) void pesquisar(pagina + 1).then(() => setInicio(prox));
  };
  const usar = async (f: FotoStock) => {
    const chave = `${f.fonte}-${f.id}`;
    setAUsar(chave); setErro(null);
    try {
      const id = (await fotoUsar(projectId, f)).asset.id;
      const a = (await lerAssets(projectId, [id])).assets[id];
      if (!a) throw new Error("A imagem já não está disponível. Escolhe outra.");
      onAceitar({ asset: a, nome: `Foto: ${f.autor} / ${f.fonte === "pexels" ? "Pexels" : "Unsplash"}` });
      setFotos(null);
    } catch (e) { setErro((e as Error).message); } finally { setAUsar(null); }
  };
  const visiveis = fotos?.slice(inicio, inicio + 3) ?? [];

  return (
    <div className="space-y-2">
      {!fotos && (
        <Button variant="outline" size="sm" className="h-11 w-full justify-start lg:h-9" disabled={aPesquisar} onClick={() => void pesquisar(1)}>
          {aPesquisar ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{rotulo}
        </Button>
      )}
      {(editar || fotos) && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void pesquisar(1); }}>
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Termo da pesquisa de fotografias" className="h-10" maxLength={100} />
          <Button type="submit" variant="outline" className="h-10 shrink-0" disabled={aPesquisar || termo.trim().length < 2}>Pesquisar</Button>
        </form>
      )}
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
      {fotos && fotos.length === 0 && <p className="text-xs text-muted-foreground">Sem resultados. Experimenta outro termo (em inglês costuma dar mais).</p>}
      {visiveis.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2" aria-label="Fotografias sugeridas">
            {visiveis.map((f) => {
              const chave = `${f.fonte}-${f.id}`;
              return (
                <li key={chave}>
                  <button type="button" disabled={!!aUsar} onClick={() => void usar(f)} aria-label={`Usar foto de ${f.autor}`}
                    className="relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--mc-r-sm)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
                    <img src={f.previewUrl} alt={f.alt || ""} loading="lazy" className="h-full w-full object-cover" />
                    {aUsar === chave && <span className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="h-4 w-4 motion-safe:animate-spin" /></span>}
                  </button>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{f.autor}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-11 flex-1 lg:h-9" disabled={aPesquisar || (!mais && inicio + 3 >= (fotos?.length ?? 0))} onClick={outras}>Outras</Button>
            <Button variant="ghost" size="sm" className="h-11 flex-1 lg:h-9" onClick={() => { setFotos(null); setEditar(false); }}>Recusar</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Toca numa fotografia para a usar. Gratuito; o crédito do autor fica guardado.</p>
        </>
      )}
    </div>
  );
}
