import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listarEdicoes, souAdminNewsletter, type Edicao } from "@/services/estudio";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-PT") : "—");

export default function Newsletter() {
  const [edicoes, setEdicoes] = useState<Edicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    listarEdicoes().then(setEdicoes).catch((e) => setErro(e.message));
    souAdminNewsletter().then(setAdmin);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Newsletter DIGITALSPRINT</h1>
        {admin && <Button asChild variant="outline" size="sm"><Link to="/newsletter/migracao">Importar dados</Link></Button>}
      </div>
      {erro && <p className="text-sm text-destructive">Não foi possível carregar as edições: {erro}</p>}
      {edicoes === null && !erro && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {edicoes?.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há edições. Importa os dados da newsletter para começar.</p>}
      <ul className="divide-y rounded-md border">
        {edicoes?.map((e) => (
          <li key={e.id}>
            <Link to={`/newsletter/${e.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted">
              <div className="min-w-0">
                <div className="font-medium">#{e.numero} · {e.assunto || "Sem assunto"}</div>
                <div className="text-xs text-muted-foreground">Prevista {fmt(e.data_envio_prevista)} · Enviada {fmt(e.enviada_em)}</div>
              </div>
              <Badge variant="secondary">{e.estado}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
