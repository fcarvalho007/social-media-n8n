import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apagarArtigo, getMarca, guardarArtigo, listarArtigos, type Artigo } from "@/services/estudio";

const vazio = { titulo: "", resumo: "", corpo: "" };

export default function Artigos() {
  const marca = getMarca();
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [edit, setEdit] = useState<Partial<Artigo> & { titulo: string }>(vazio);

  const carregar = () => listarArtigos(marca).then(setArtigos).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    if (!edit.titulo.trim()) return toast.error("Indica um título");
    try { await guardarArtigo({ ...edit, project_id: edit.project_id ?? marca }); toast.success("Rascunho guardado"); setEdit(vazio); carregar(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[1fr_2fr]">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Artigos de blog</h1>
        {!marca && <p className="text-xs text-muted-foreground">Sem marca escolhida no Estúdio: a mostrar todos os rascunhos.</p>}
        <Button variant="outline" size="sm" onClick={() => setEdit(vazio)}>Novo rascunho</Button>
        <ul className="divide-y rounded-md border">
          {artigos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 p-2">
              <button className="min-w-0 truncate text-left text-sm hover:underline" onClick={() => setEdit(a)}>{a.titulo}</button>
              <Button variant="ghost" size="sm" onClick={async () => { await apagarArtigo(a.id); carregar(); }}>Apagar</Button>
            </li>
          ))}
          {artigos.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sem rascunhos.</li>}
        </ul>
      </div>
      <div className="space-y-2">
        <Input placeholder="Título" value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
        <Textarea placeholder="Resumo" rows={3} value={edit.resumo ?? ""} onChange={(e) => setEdit({ ...edit, resumo: e.target.value })} />
        <Textarea placeholder="Texto do artigo" rows={18} value={edit.corpo ?? ""} onChange={(e) => setEdit({ ...edit, corpo: e.target.value })} />
        <Button onClick={guardar}>Guardar rascunho</Button>
      </div>
    </div>
  );
}
