import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Layers, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjeto } from "@/contexts/ProjetoContext";
import { LimitesIa } from "@/features/motor/LimitesIa";
import { Grupo } from "@/features/motor/Estudio";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { lerCapas, listarTrabalhos, type Capa, type EstadoTrabalho, type TrabalhoResumo } from "@/services/motor";
import { cn } from "@/lib/utils";
import type { Medidor } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { paraPacote } from "../../supabase/functions/_shared/motor/proposta";

export const NOME_ESTADO: Record<EstadoTrabalho, string> = {
  pendente: "Na fila", a_processar: "A preparar", concluido: "Pronto", erro: "Erro", desconhecido: "Resultado incerto", cancelado: "Cancelado",
};
export const dataPt = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Test/demo work is labelled as such, never presented as production. */
export function etiquetaTeste(t: TrabalhoResumo, capa?: Capa): string | null {
  if (t.modelo === "simulado-demo" || capa?.conteudo.demonstracao) return "Demonstração";
  if (/FIXTURE|\bteste\b|^R\d+\s*[—-]/i.test(t.titulo ?? capa?.conteudo.titulo ?? "")) return "Teste";
  return null;
}

const THUMB_W = 180;

export default function Carrosseis() {
  const { projetoId, projetos, estado: estadoProj } = useProjeto();
  const [itens, setItens] = useState<TrabalhoResumo[] | null>(null);
  const [capas, setCapas] = useState<Record<string, Capa>>({});
  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { carregarMedidor().then(setMedidor).catch(() => undefined); }, []);
  useEffect(() => {
    let vivo = true;
    setItens(null); setErro(null); setCapas({});
    listarTrabalhos(projetoId).then((r) => {
      if (!vivo) return;
      setItens(r);
      lerCapas(r.slice(0, 48).map((t) => t.id)).then((c) => vivo && setCapas(c)).catch(() => undefined);
    }).catch((e: Error) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [projetoId]);

  const nomeProjeto = (id: string) => projetos.find((p) => p.id === id)?.name ?? "Projeto";

  return (
    <div className="mc-estudio -m-0 min-h-[calc(100dvh-4rem)] sm:-m-4 md:-m-6">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Carrosséis</h1>
            <p className="text-sm text-muted-foreground">{estadoProj === "pronto" ? (projetoId ? nomeProjeto(projetoId) : "Todos os projetos") : "A carregar projetos…"}</p>
          </div>
          <Button asChild className="h-11 px-5"><Link to="/estudio/carrosseis/novo"><Plus className="mr-1.5 h-4 w-4" />Novo carrossel</Link></Button>
        </header>

        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {!itens && !erro && <p className="flex items-center text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A carregar…</p>}

        {itens && itens.length === 0 && (
          <div className="mc-entrar max-w-lg space-y-4 py-16">
            <Layers className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-lg font-medium">Ainda não há carrosséis{projetoId ? " neste projeto" : ""}.</p>
            <p className="text-sm text-muted-foreground">Cola um texto, escolhe o objetivo e o estúdio propõe a narrativa e duas composições.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-11"><Link to="/estudio/carrosseis/novo">Começar com um texto</Link></Button>
              <Button asChild variant="ghost" className="h-11 text-muted-foreground"><Link to="/estudio/carrosseis/novo?demo=1"><FlaskConical className="mr-1.5 h-4 w-4" />Ver exemplo de demonstração</Link></Button>
            </div>
          </div>
        )}

        {itens && itens.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5" aria-label="Biblioteca de carrosséis">
            {itens.map((t) => {
              const capa = capas[t.id];
              const titulo = t.titulo || capa?.conteudo.titulo || capa?.conteudo.slides[0]?.titulo || "Carrossel sem título";
              const tag = etiquetaTeste(t, capa);
              const falhou = t.estado === "erro" || t.estado === "desconhecido";
              return (
                <li key={t.id} className="mc-entrar">
                  <Link to={`/estudio/carrosseis/${t.id}`} className="group block rounded-[var(--mc-r-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="mc-trans relative aspect-[4/5] overflow-hidden rounded-[var(--mc-r-md)] border border-border bg-card group-hover:border-muted-foreground/60">
                      {capa && medidor ? (
                        <div className="absolute inset-0 [&_canvas]:!h-full [&_canvas]:!w-full [&>div]:!h-full [&>div]:!w-full">
                          <PaginaCanvas pacote={paraPacote(t.id, titulo, capa.conteudo, { A: capa.documento, B: capa.documento })} variante="A" indice={0} medidor={medidor} imagens={{}} escala={THUMB_W / 1080} />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                          {t.estado === "pendente" || t.estado === "a_processar" ? "A preparar…" : falhou ? "Sem composição" : ""}
                        </div>
                      )}
                      {tag && <span className="absolute left-2 top-2 rounded-[var(--mc-r-sm)] bg-background/90 px-1.5 py-0.5 text-[11px] text-muted-foreground">{tag}</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{titulo}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn(t.estado === "concluido" ? "text-primary" : falhou && "text-destructive")}>{NOME_ESTADO[t.estado]}</span>
                      <span aria-hidden>·</span><span className="truncate">{!projetoId && `${nomeProjeto(t.project_id)} · `}{dataPt(t.actualizado_em ?? t.criado_em)}</span>
                    </p>
                    <span className="sr-only">{t.estado === "concluido" ? "Abrir" : "Retomar"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {projetoId && (
          <div className="max-w-2xl pt-4">
            <Grupo titulo="Limites da IA neste projeto"><LimitesIa projectId={projetoId} /></Grupo>
          </div>
        )}
      </div>
    </div>
  );
}
