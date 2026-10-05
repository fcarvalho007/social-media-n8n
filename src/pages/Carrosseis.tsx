import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Layers, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjeto } from "@/contexts/ProjetoContext";
import { LimitesIa } from "@/features/motor/LimitesIa";
import { Grupo, useLargura } from "@/features/motor/Estudio";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { lerCapas, lerEstadosPublicacao, listarTrabalhos, type Capa, type EstadoTrabalho, type TrabalhoResumo } from "@/services/motor";
import { estadoPublicacao, NOME_ESTADO_CONTEUDO, NOME_ESTADO_REDE, NOME_REDE, type EstadoPublicacao } from "@/features/motor/publicacao";
import { cn } from "@/lib/utils";
import { etiquetaTeste, eProva } from "@/features/motor/biblioteca";
export { etiquetaTeste, eProva };
import type { Medidor } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { paraPacote } from "../../supabase/functions/_shared/motor/proposta";

export const NOME_ESTADO: Record<EstadoTrabalho, string> = {
  pendente: "Na fila", a_processar: "A preparar", concluido: "Pronto", erro: "Erro", desconhecido: "Resultado incerto", cancelado: "Cancelado",
};
export const dataPt = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });


function Miniatura({ render }: { render: (w: number) => React.ReactNode }) {
  const [ref, w] = useLargura<HTMLDivElement>();
  return <div ref={ref} className="absolute inset-0">{w > 0 && render(w)}</div>;
}

export default function Carrosseis() {
  const { projetoId, projetos, estado: estadoProj } = useProjeto();
  const [itens, setItens] = useState<TrabalhoResumo[] | null>(null);
  const [capas, setCapas] = useState<Record<string, Capa>>({});
  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verProvas, setVerProvas] = useState(false);
  const [estados, setEstados] = useState<Record<string, EstadoPublicacao> | null>(null);
  const [erroEstados, setErroEstados] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [aba, setAba] = useState<"por_publicar" | "publicados">("por_publicar");

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
  }, [projetoId, tentativa]);

  useEffect(() => {
    if (!itens) return;
    let vivo = true;
    setEstados(null); setErroEstados(null);
    lerEstadosPublicacao(itens.map((t) => t.id)).then((r) => {
      if (!vivo) return;
      setEstados(Object.fromEntries(itens.map((t) => [t.id, estadoPublicacao({ trabalho: t, docs: r.docs[t.id] ?? [], ligacoes: r.ligacoes, drafts: r.drafts, posts: r.posts })])));
    }).catch((e: Error) => vivo && setErroEstados(e.message));
    return () => { vivo = false; };
  }, [itens]);

  const nProvas = itens?.filter(eProva).length ?? 0;
  const reais = itens?.filter((t) => verProvas || !eProva(t)) ?? null;
  const contar = (g: EstadoPublicacao["grupo"]) => (estados && reais ? reais.filter((t) => estados[t.id]?.grupo === g).length : null);
  // Without a reliable state the list is shown ungrouped; nothing is ever counted as published by default.
  const visiveis = reais && estados ? reais.filter((t) => estados[t.id]?.grupo === aba) : reais;
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

        {itens && (
          <div className="space-y-2">
            <div role="tablist" aria-label="Estado de publicação" className="inline-flex gap-1 rounded-[var(--mc-r-md)] bg-muted p-1">
              {([["por_publicar", "Por publicar"], ["publicados", "Publicados"]] as const).map(([id, nome]) => (
                <button key={id} type="button" role="tab" aria-selected={aba === id} disabled={!estados} onClick={() => setAba(id)}
                  className={cn("min-h-10 rounded-sm px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", aba === id && estados ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {nome} <span className="tabular-nums text-muted-foreground">{contar(id) ?? "–"}</span>
                </button>
              ))}
            </div>
            {!estados && !erroEstados && <p role="status" className="flex items-center text-xs text-muted-foreground"><Loader2 className="mr-1.5 h-3.5 w-3.5 motion-safe:animate-spin" />A verificar o estado de publicação…</p>}
            {erroEstados && (
              <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
                {erroEstados} A lista abaixo não está separada por estado.
                <Button variant="outline" size="sm" className="h-9" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Button>
              </p>
            )}
          </div>
        )}

        {itens && nProvas > 0 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={verProvas} onChange={(e) => setVerProvas(e.target.checked)} />
            Mostrar provas e demonstrações ({nProvas})
          </label>
        )}

        {visiveis && visiveis.length === 0 && estados && aba === "publicados" && reais && reais.length > 0 && (
          <div className="mc-entrar max-w-lg space-y-4 py-16">
            <Layers className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-lg font-medium">Ainda não há publicações confirmadas{projetoId ? " neste projeto" : ""}.</p>
            <p className="text-sm text-muted-foreground">Um carrossel só aparece aqui quando a rede confirma a publicação da versão atual. Publicações antigas sem essa ligação não são contadas.</p>
            <div className="flex flex-wrap gap-2">
              {(contar("por_publicar") ?? 0) > 0 && <Button className="h-11" onClick={() => setAba("por_publicar")}>Ver carrosséis por publicar ({contar("por_publicar")})</Button>}
              <Button asChild variant={(contar("por_publicar") ?? 0) > 0 ? "outline" : "default"} className="h-11"><Link to="/estudio/carrosseis/novo">Novo carrossel</Link></Button>
            </div>
          </div>
        )}
        {visiveis && visiveis.length === 0 && !(estados && aba === "publicados" && reais && reais.length > 0) && (
          <div className="mc-entrar max-w-lg space-y-4 py-16">
            <Layers className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-lg font-medium">{estados && reais && reais.length > 0 ? "Nada por publicar" : nProvas > 0 && !verProvas ? "Ainda não há carrosséis reais" : "Ainda não há carrosséis"}{projetoId ? " neste projeto" : ""}.</p>
            <p className="text-sm text-muted-foreground">Cola um texto, escolhe o objetivo e o estúdio propõe a narrativa e duas composições.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-11"><Link to="/estudio/carrosseis/novo">Criar primeiro carrossel</Link></Button>
              <Button asChild variant="ghost" className="h-11 text-muted-foreground"><Link to="/estudio/carrosseis/novo?demo=1"><FlaskConical className="mr-1.5 h-4 w-4" />Ver exemplo de demonstração</Link></Button>
            </div>
          </div>
        )}

        {visiveis && visiveis.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5" aria-label="Biblioteca de carrosséis">
            {visiveis.map((t) => {
              const capa = capas[t.id];
              const titulo = t.titulo || capa?.conteudo.titulo || capa?.conteudo.slides[0]?.titulo || "Carrossel sem título";
              const tag = etiquetaTeste(t, capa);
              const falhou = t.estado === "erro" || t.estado === "desconhecido";
              const ep = estados?.[t.id];
              return (
                <li key={t.id} className="mc-entrar">
                  <Link to={`/estudio/carrosseis/${t.id}`} className="group block rounded-[var(--mc-r-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="mc-trans relative aspect-[4/5] overflow-hidden rounded-[var(--mc-r-md)] border border-border bg-card group-hover:border-muted-foreground/60">
                      {capa && medidor ? (
                        <Miniatura render={(w) => <PaginaCanvas pacote={paraPacote(t.id, titulo, capa.conteudo, { A: capa.documento, B: capa.documento })} variante="A" indice={0} medidor={medidor} imagens={{}} escala={w / 1080} />} />
                      ) : (
                        <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                          {t.estado === "pendente" || t.estado === "a_processar" ? "A preparar…" : falhou ? "Sem composição" : ""}
                        </div>
                      )}
                      {tag && <span className="absolute left-2 top-2 rounded-[var(--mc-r-sm)] bg-background/90 px-1.5 py-0.5 text-[11px] text-muted-foreground">{tag}</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{titulo}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {ep ? <span className={cn(ep.estado === "publicado" ? "text-primary" : (ep.estado === "erro" || ep.estado === "por_confirmar") && "text-destructive")}>{NOME_ESTADO_CONTEUDO[ep.estado]}</span>
                        : <span className={cn(t.estado === "concluido" ? "text-primary" : falhou && "text-destructive")}>{NOME_ESTADO[t.estado]}</span>}
                      <span aria-hidden>·</span><span className="truncate">{!projetoId && `${nomeProjeto(t.project_id)} · `}{dataPt(t.actualizado_em ?? t.criado_em)}</span>
                    </p>
                    {ep && ep.redes.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{ep.redes.map((r) => `${NOME_REDE[r.rede] ?? r.rede}: ${NOME_ESTADO_REDE[r.estado]}`).join(" · ")}</p>}
                    {ep?.versaoAtual != null && <p className="mt-0.5 text-xs text-muted-foreground">Versão {ep.versaoAtual}{ep.nota ? ` · ${ep.nota}` : ""}</p>}
                    <span className="mt-1 inline-block text-xs font-medium text-primary group-hover:underline">{ep?.grupo === "publicados" ? "Abrir" : "Continuar"}</span>
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
