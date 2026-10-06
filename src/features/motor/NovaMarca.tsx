import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarMarca, type Projeto } from "@/services/estudio";
import { notificarProjetosAlterados } from "@/lib/eventosProjetos";

const CORES = ["#3E5B46", "#0B1F33", "#2563EB", "#F59E0B", "#DC2626", "#9333EA"];

interface Props { aberto: boolean; onFechar: () => void; onCriada: (p: Projeto) => void }

/** Small dialog to add a brand: name, colour and an optional uploaded logo. */
export function NovaMarca({ aberto, onFechar, onCriada }: Props) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES[0]);
  const [logo, setLogo] = useState<File | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const guardar = async () => {
    setAGuardar(true);
    try {
      const p = await criarMarca(nome, cor, logo);
      notificarProjetosAlterados();
      toast.success(`Marca «${p.name}» criada.`);
      onCriada(p); setNome(""); setLogo(null); onFechar();
    } catch (e) { toast.error((e as Error).message || "Não foi possível criar a marca."); }
    finally { setAGuardar(false); }
  };
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !aGuardar && onFechar()}>
      <DialogContent className="mc-estudio max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar marca</DialogTitle>
          <DialogDescription>A marca etiqueta os carrosséis e define a cor inicial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="nm-nome">Nome</Label>
            <Input id="nm-nome" value={nome} maxLength={60} placeholder="Ex.: smsonline.pt" onChange={(e) => setNome(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Cor</Label>
            <div className="flex gap-2">{CORES.map((c) => (
              <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={cor === c} onClick={() => setCor(c)}
                className={`h-9 w-9 rounded-full border-2 ${cor === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
            ))}</div></div>
          <div className="space-y-1.5"><Label htmlFor="nm-logo">Logótipo <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input id="nm-logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP até 5 MB. Nunca é colocado nos slides automaticamente.</p></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar} disabled={aGuardar}>Cancelar</Button>
          <Button onClick={guardar} disabled={aGuardar || nome.trim().length < 2}>{aGuardar ? "A criar…" : "Criar marca"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
