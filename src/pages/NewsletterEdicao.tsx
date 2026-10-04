import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { guardarEdicao, obterEdicao, type Cronica, type Edicao } from "@/services/estudio";

export default function NewsletterEdicao() {
  const { id = "" } = useParams();
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [cronica, setCronica] = useState<Cronica | null>(null);
  const [assunto, setAssunto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    obterEdicao(id).then(({ edicao, cronica }) => {
      setEdicao(edicao); setCronica(cronica);
      setAssunto(edicao.assunto ?? ""); setTitulo(cronica?.titulo ?? ""); setConteudo(cronica?.conteudo ?? "");
    }).catch((e) => toast.error(`Não foi possível abrir a edição: ${e.message}`));
  }, [id]);

  const enviada = !!edicao?.enviada_em;
  const guardar = async () => {
    setAGuardar(true);
    try {
      await guardarEdicao(id, assunto, { id: cronica?.id, titulo, conteudo });
      toast.success("Edição guardada");
    } catch (e) { toast.error(`Erro ao guardar: ${(e as Error).message}`); }
    setAGuardar(false);
  };

  if (!edicao) return <p className="p-4 text-sm text-muted-foreground">A carregar…</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/newsletter" className="text-sm text-muted-foreground hover:underline">← Edições</Link>
      <h1 className="text-2xl font-semibold">Edição #{edicao.numero}</h1>
      {enviada && <p className="text-sm text-muted-foreground">Esta edição já foi enviada; está em modo de leitura.</p>}
      <div className="space-y-1"><Label htmlFor="assunto">Assunto</Label><Input id="assunto" value={assunto} disabled={enviada} onChange={(e) => setAssunto(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="titulo">Título da crónica</Label><Input id="titulo" value={titulo} disabled={enviada} onChange={(e) => setTitulo(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="conteudo">Crónica</Label><Textarea id="conteudo" rows={16} value={conteudo} disabled={enviada} onChange={(e) => setConteudo(e.target.value)} /></div>
      {!enviada && <Button onClick={guardar} disabled={aGuardar}>{aGuardar ? "A guardar…" : "Guardar"}</Button>}
    </div>
  );
}
