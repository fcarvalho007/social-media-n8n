import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { lerAssets, listarImagens, registarImagem, type AssetMotor, type ImagemBiblioteca } from "@/services/motor";
import { GeradorKie } from "./GeradorKie";
import type { Asset } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

interface Props {
  projectId: string;
  aberto: boolean;
  onFechar: (r: { asset: Asset; nome: string } | null) => void;
}

/**
 * Authorised images only: the caller's own library images (copied once, server-validated, into this project's
 * immutable engine assets) and assets already linked to this project. No URL field, no other users' files.
 */
export function SeletorImagens({ projectId, aberto, onFechar }: Props) {
  const [dados, setDados] = useState<{ biblioteca: ImagemBiblioteca[]; assets: AssetMotor[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aUsar, setAUsar] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setDados(null); setErro(null);
    listarImagens(projectId).then((d) => vivo && setDados(d)).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [aberto, projectId]);

  const usar = async (chave: string, nome: string, obter: () => Promise<string>) => {
    setAUsar(chave); setErro(null);
    try {
      const id = await obter();
      const r = await lerAssets(projectId, [id]);
      const a = r.assets[id];
      if (!a) throw new Error("A imagem já não está disponível. Escolhe outra.");
      onFechar({ asset: a, nome });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAUsar(null);
    }
  };

  const ligadas = new Set((dados?.assets ?? []).map((a) => a.media_id));
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !aUsar && onFechar(null)}>
      <DialogContent className="mc-estudio max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar imagem</DialogTitle>
          <DialogDescription>Só imagens da tua biblioteca. Ao escolher, é guardada uma cópia fixa para este projeto.</DialogDescription>
        </DialogHeader>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {!dados && !erro && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A carregar imagens…</p>}
        {dados && dados.biblioteca.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImageOff className="h-4 w-4" />Ainda não há imagens na tua biblioteca. Carrega-as ou gera-as no Estúdio de IA.</p>
        )}
        {dados && dados.biblioteca.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Imagens da biblioteca">
            {dados.biblioteca.map((m) => (
              <li key={m.id}>
                <button type="button" disabled={!!aUsar} onClick={() => usar(m.id, m.file_name, async () => (await registarImagem(projectId, m.id)).asset.id)}
                  className="group relative block aspect-square w-full overflow-hidden rounded-[var(--mc-r-md)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  aria-label={`Usar ${m.file_name}`}>
                  <img src={m.thumbnail_url ?? m.file_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {ligadas.has(m.id) && <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[11px]">No projeto</span>}
                  {aUsar === m.id && <span className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-5 w-5 motion-safe:animate-spin" /></span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <GeradorKie projectId={projectId} usar={usar} ocupado={!!aUsar} />
        <p className="text-xs text-muted-foreground">PNG ou JPEG, até 6 MB e 8000 px por lado. Outros formatos são recusados.</p>
        <div className="flex justify-end"><Button variant="ghost" className="h-11" disabled={!!aUsar} onClick={() => onFechar(null)}>Cancelar</Button></div>
      </DialogContent>
    </Dialog>
  );
}
