// @ts-nocheck — type drift vs origin library versions; see scripts/port-newsletter.py
import { Link } from "@/newsletter/shim/router";
import { Check, Loader2, Mic, RefreshCw } from "lucide-react";
import type { Episodio } from "../data";
import { T, SECS, Foldable, EmptyState } from "./ui";

/** Selector do episódio do podcast — partilhado pelos dois editores. */
export interface PodcastProps {
  episodios: Episodio[];
  episodioActivoId: string | null;
  bloqueado: boolean;
  feedUrl: string;
  aSincronizarFeed: boolean;
  onSincronizar: () => void;
  onEscolher: (ep: Episodio) => void;
  mostrarTodosEpisodios: boolean;
  setMostrarTodosEpisodios: React.Dispatch<React.SetStateAction<boolean>>;
  foldOpen: Record<string, boolean>;
  setFoldOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Nota opcional sobre o estado do episódio escolhido (usada no formato Revista). */
  aviso?: React.ReactNode;
}

export function Podcast({
  episodios, episodioActivoId, bloqueado, feedUrl, aSincronizarFeed, onSincronizar, onEscolher,
  mostrarTodosEpisodios, setMostrarTodosEpisodios, foldOpen, setFoldOpen, aviso,
}: PodcastProps) {

            const feedConfigurado = !!(feedUrl ?? "").trim();
            const aSincronizar = aSincronizarFeed;
            const btnSync = (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (!feedConfigurado || aSincronizar) return; onSincronizar(); }}
                disabled={!feedConfigurado || aSincronizar}
                title={feedConfigurado ? "Ler o feed RSS e importar novos episódios" : "Define o URL do feed em Definições"}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ border: `1px solid ${T.line}`, background: T.card, color: T.ink }}>
                {aSincronizar ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {aSincronizar ? "A sincronizar…" : "Actualizar do RSS"}
              </button>
            );
            return (
              <Foldable foldOpen={foldOpen} setFoldOpen={setFoldOpen} secId="podcast" icon={SECS.podcast.icon} accent={SECS.podcast.cor} titulo={SECS.podcast.titulo} defaultOpen
                acao={btnSync}
                contador={(() => {
                  const ativo = episodios.find((e) => e.id === episodioActivoId);
                  return ativo ? (ativo.codigo ?? ativo.titulo.slice(0, 24)) : "Por escolher";
                })()}>
                <p className="text-xs mb-3" style={{ color: T.faint }}>
                  Últimos episódios do RSS do <em>Marketing por Idiotas</em>. Escolhe o episódio que vai no email — só entra depois de escolhido.
                  {!feedConfigurado && <> · <Link to="/definicoes" className="underline" style={{ color: T.primary }}>Configura o feed em Definições</Link>.</>}
                </p>
                {aviso && <div className="mb-3">{aviso}</div>}
                <div className="space-y-2">

                  {episodios.length === 0 && (
                    <EmptyState icon={Mic} texto={feedConfigurado
                      ? "Ainda sem episódios sincronizados — carrega em «Actualizar do RSS» acima."
                      : "URL do feed em falta — configura-o em Definições para sincronizar automaticamente."} />
                  )}
                  {(() => {
                    const activoId = episodioActivoId ?? null;
                    const top = episodios.slice(0, 3);
                    const activoForaTop = activoId && !top.some((e) => e.id === activoId)
                      ? episodios.find((e) => e.id === activoId)
                      : null;
                    const listaColapsada = activoForaTop ? [...top, activoForaTop] : top;
                    const lista = mostrarTodosEpisodios ? episodios : listaColapsada;
                    const restantes = episodios.length - listaColapsada.length;

                    return (
                      <>
                        {lista.map((ep) => {
                          const iOriginal = episodios.indexOf(ep);
                          const activo = episodioActivoId === ep.id;
                          return (
                            <button key={ep.id} type="button" disabled={bloqueado} onClick={() => onEscolher(ep)}
                              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors disabled:opacity-50"
                              style={{ background: activo ? "rgba(239,68,68,0.10)" : T.card, border: `1px solid ${activo ? T.dangerAccent : T.line}` }}>
                              <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm" style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>🎙️</span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold leading-snug">{ep.titulo}</span>
                                <span className="block text-[12px] mt-0.5" style={{ color: T.muted }}>
                                  {ep.codigo ?? "sem código"}{ep.data_publicacao ? ` · ${new Date(ep.data_publicacao).toLocaleDateString("pt-PT")}` : ""}{iOriginal === 0 ? " · mais recente" : ""}
                                </span>
                              </span>
                              {activo && <Check size={16} style={{ color: T.danger }} className="shrink-0" />}
                            </button>
                          );
                        })}
                        {restantes > 0 && (
                          <button type="button" onClick={() => setMostrarTodosEpisodios((v) => !v)}
                            className="w-full text-[12px] font-semibold py-2 rounded-lg transition-colors"
                            style={{ color: T.muted, background: "transparent", border: `1px dashed ${T.line}` }}>
                            {mostrarTodosEpisodios ? "Mostrar menos" : `Mostrar mais ${restantes} episódio${restantes === 1 ? "" : "s"}`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Foldable>
            );
}
