import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Share2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMarca, listarProjetos, setMarca, type Projeto } from "@/services/estudio";

const MODULOS = [
  { titulo: "Publicação para redes sociais", desc: "Instagram, LinkedIn, Facebook e outras redes", icon: Share2, url: "/manual-create" },
  { titulo: "Newsletter DIGITALSPRINT", desc: "Edições, crónica e arquivo", icon: Mail, url: "/newsletter" },
  { titulo: "Artigo de blog", desc: "Rascunhos por projeto, sem publicação automática", icon: FileText, url: "/artigos" },
];

export default function Estudio() {
  const nav = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [marca, setM] = useState<string | null>(getMarca());

  useEffect(() => { listarProjetos().then(setProjetos).catch(() => setProjetos([])); }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Estúdio de conteúdos</h1>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Para quem?</h2>
        <Select value={marca ?? undefined} onValueChange={(v) => { setM(v); setMarca(v); }}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder={projetos.length ? "Escolhe a marca ou projeto" : "Sem projetos criados"} /></SelectTrigger>
          <SelectContent>{projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">O que queres fazer?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODULOS.map((m) => (
            <Card key={m.url} role="button" tabIndex={0} onClick={() => nav(m.url)} onKeyDown={(e) => e.key === "Enter" && nav(m.url)}
              className="cursor-pointer p-4 transition-colors hover:border-primary">
              <m.icon className="mb-2 h-6 w-6 text-primary" />
              <div className="font-medium">{m.titulo}</div>
              <div className="text-sm text-muted-foreground">{m.desc}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
