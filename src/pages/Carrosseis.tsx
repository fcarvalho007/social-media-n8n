import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjeto } from "@/contexts/ProjetoContext";
import { listarTrabalhos, type EstadoTrabalho, type TrabalhoResumo } from "@/services/motor";

export const NOME_ESTADO: Record<EstadoTrabalho, string> = {
  pendente: "Na fila", a_processar: "A preparar", concluido: "Pronto", erro: "Erro", desconhecido: "Resultado incerto", cancelado: "Cancelado",
};
export const dataPt = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Carrosseis() {
  const { projetoId, projetos, estado: estadoProj } = useProjeto();
  const [itens, setItens] = useState<TrabalhoResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setItens(null); setErro(null);
    listarTrabalhos(projetoId).then((r) => vivo && setItens(r)).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [projetoId]);

  const nomeProjeto = (id: string) => projetos.find((p) => p.id === id)?.name ?? "Projeto";

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-0">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Carrosséis</h1>
          <p className="text-sm text-muted-foreground">
            {estadoProj === "pronto" ? (projetoId ? `Projeto: ${nomeProjeto(projetoId)}` : "Todos os projetos") : "A carregar projetos…"}
          </p>
        </div>
        <Button asChild className="h-11 sm:h-9"><Link to="/estudio/carrosseis/novo"><Plus className="mr-1.5 h-4 w-4" />Novo carrossel</Link></Button>
      </header>

      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {!itens && !erro && <p className="flex items-center text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A carregar…</p>}
      {itens && itens.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Layers className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm">Ainda não há carrosséis {projetoId ? "neste projeto" : ""}.</p>
          <p className="text-sm text-muted-foreground">Começa por colar um texto em «Novo carrossel».</p>
        </div>
      )}
      {itens && itens.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {itens.map((t) => (
            <li key={t.id}>
              <Link to={`/estudio/carrosseis/${t.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.titulo || "Sem título"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {!projetoId && `${nomeProjeto(t.project_id)} · `}{dataPt(t.criado_em)}{t.modelo === "simulado-demo" && " · demonstração"}
                  </p>
                </div>
                <Badge variant={t.estado === "concluido" ? "secondary" : t.estado === "erro" || t.estado === "desconhecido" ? "destructive" : "outline"}>{NOME_ESTADO[t.estado]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
