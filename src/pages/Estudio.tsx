import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Share2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  associarIdentidade, getMarca, listarIdentidades, listarProjetos, setMarca, souAdminNewsletter,
  type Identidade, type Projeto,
} from "@/services/estudio";

const MODULOS = [
  { titulo: "Redes sociais", desc: "Carrossel da crónica e publicação livre (Instagram, LinkedIn…)", icon: Share2, url: "/estudio/redes-sociais" },
  { titulo: "Newsletter DIGITALSPRINT", desc: "Edições, crónica e arquivo", icon: Mail, url: "/newsletter" },
  { titulo: "Artigo de blog", desc: "Rascunhos por projeto, sem publicação automática", icon: FileText, url: "/artigos" },
];
const SEM = "__sem__";

export default function Estudio() {
  const nav = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [identidades, setIdentidades] = useState<Identidade[]>([]);
  const [marca, setM] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    listarProjetos().then(setProjetos).catch(() => setProjetos([]));
    listarIdentidades().then(setIdentidades).catch(() => setIdentidades([]));
    getMarca().then(setM).catch(() => setM(null));
    souAdminNewsletter().then(setStaff).catch(() => setStaff(false));
  }, []);

  const escolher = async (v: string) => {
    const id = v === SEM ? null : v;
    setM(id);
    try { await setMarca(id); } catch (e) { toast.error((e as Error).message); }
  };
  const associar = async (ident: Identidade, v: string) => {
    const id = v === SEM ? null : v;
    try {
      await associarIdentidade(ident.id, id);
      setIdentidades((l) => l.map((x) => (x.id === ident.id ? { ...x, project_id: id } : x)));
      toast.success("Associação guardada");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Estúdio de conteúdos</h1>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Para quem?</h2>
        <Select value={marca ?? SEM} onValueChange={escolher}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Escolhe a marca ou projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM}>Sem projeto (todos)</SelectItem>
            {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {identidades.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{i.nome} ({i.tipo === "newsletter" ? "newsletter" : i.tipo}) pertence a</span>
            <Select value={i.project_id ?? SEM} onValueChange={(v) => associar(i, v)} disabled={!staff}>
              <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM}>Sem projeto associado</SelectItem>
                {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
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
