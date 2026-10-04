// Modal de envio partilhado. A orquestração vive em `useEnvioNewsletter`;
// aqui só existe UI. O servidor escolhe o renderer certo pelo `template_version`
// da edição, por isso este componente serve Clássico e Revista sem ramificações.
//
// No formato Revista mostra-se ainda o resumo de prontidão (Fase E3): antes de
// confirmar, a pessoa vê numa linguagem simples o que está pronto e o que falta.

import { avisosConfirmaveisDe, bloqueiosRigidosDe } from "@/newsletter/lib/newsletter-engine/revista/prontidao-rotulos";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarClock, CheckCircle2, Circle, FileText,
  Globe, Loader2, Lock, Radio, TestTube2, XCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { estadoDestinosFn, prontidaoRevistaFn } from "@/newsletter/lib/destinos.functions";
import { baseUrlEdicoesFn } from "@/newsletter/lib/revista-web.functions";
import { PreVisualizarEdicao, type VistaPrevia } from "@/newsletter/features/newsletter/revista/PreVisualizarEdicao";
import { AvisoChecklistModal } from "@/newsletter/features/newsletter/AvisoChecklistModal";
import type { ItemChecklist } from "@/newsletter/features/newsletter/checklist";
import { Button } from "@/components/ui/button";
import { useEnvioNewsletter } from "./useEnvioNewsletter";

export interface EnvioNewsletterProps {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  edicaoId: string;
  numero: number;
  isAdmin: boolean;
  /** Pontos por resolver antes de enviar (avisam, mas não bloqueiam o disparo). */
  problemas: string[];
  /** Formato Revista: activa o resumo de prontidão multicanal. */
  revista?: boolean;
  onEnviado?: () => void;
}

type EstadoVerificacao = "pronto" | "atencao" | "a_verificar" | "bloqueado";

function ItemVerificacao({ estado, titulo, detalhe }: {
  estado: EstadoVerificacao;
  titulo: string;
  detalhe: string;
}) {
  const visual = estado === "pronto"
    ? { caixa: "border-estado-pronto-borda bg-estado-pronto-suave", cor: "text-estado-pronto", rotulo: "Concluído", icone: <CheckCircle2 /> }
    : estado === "bloqueado"
      ? { caixa: "border-destructive/35 bg-destructive/5", cor: "text-destructive", rotulo: "Bloqueado", icone: <XCircle /> }
      : estado === "a_verificar"
        ? { caixa: "border-border bg-muted/30", cor: "text-muted-foreground", rotulo: "A verificar", icone: <Loader2 className="animate-spin" /> }
        : { caixa: "border-estado-falta-borda bg-estado-falta-suave", cor: "text-estado-falta", rotulo: "Atenção", icone: <AlertTriangle /> };

  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${visual.caixa}`}>
      <span className={`mt-0.5 [&>svg]:size-5 ${visual.cor}`}>{visual.icone}</span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold text-foreground">{titulo}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">{detalhe}</span>
      </span>
      <span className={`col-start-2 shrink-0 text-[10px] font-bold uppercase tracking-wide sm:col-start-3 sm:row-start-1 ${visual.cor}`}>{visual.rotulo}</span>
    </div>
  );
}

export function EnvioNewsletter({
  aberto, onAberto, edicaoId, numero, isAdmin, problemas, revista, onEnviado,
}: EnvioNewsletterProps) {
  const [confirmNumero, setConfirmNumero] = useState("");
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  // A pré-visualização ocupa o ecrã: fecha o modal de envio enquanto está
  // aberta (o overlay do Dialog bloquearia os cliques) e devolve-o ao fechar.
  const abrirPrevia = (v: VistaPrevia) => { setPrevia(v); onAberto(false); };
  const fecharPrevia = () => { setPrevia(null); onAberto(true); };
  const [erro, setErro] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<string | null>(null);
  const [confirmarPublicacao, setConfirmarPublicacao] = useState(false);

  const envio = useEnvioNewsletter({
    edicaoId,
    numero,
    onDisparoConcluido: (r) => {
      onEnviado?.();
      if (r.falhas > 0) {
        setResultadoFinal(null);
        setErro(r.mensagem);
        return;
      }
      setErro(null);
      setResultadoFinal(r.modo === "teste"
        ? `Teste enviado com sucesso para ${r.resultados.map((item) => item.lista_nome).join(", ")}.`
        : `Edição enviada com sucesso para ${r.resultados.map((item) => item.lista_nome).join(", ")}.`);
      if (r.modo === "teste") {
        const destinos = r.resultados.map((item) => item.lista_nome).join(", ");
        onAberto(false);
        toast.success(`Teste enviado com sucesso para ${destinos}.`);
      }
    },
    onDisparoErro: (msg) => { setResultadoFinal(null); setErro(msg); },
    onRepetirErro: (msg) => setErro(msg),
    onAgendado: () => { setErro(null); onAberto(false); },
    onAgendarErro: setErro,
  });

  const {
    listas, listasSel, setListasSel, progresso, esperaSeg,
    agendarQuando, setAgendarQuando, disparar, repetirLista, agendar, reset,
  } = envio;

  useEffect(() => {
    if (!aberto) {
      reset();
      setResultadoFinal(null);
    }
  }, [aberto, reset]);

  const activas = listas.filter((l) => l.activa);
  const escolhidas = activas.filter((l) => listasSel.includes(l.id));
  const isReal = escolhidas.some((l) => l.tipo === "real");
  const numOk = !isReal || confirmNumero.trim() === String(numero);
  const bloqueioCurador = isReal && !isAdmin;
  const emCurso = disparar.isPending;
  const indiceAEnviar = progresso.findIndex((p) => p.estado === "a_enviar");
  const indiceEmEspera = progresso.findIndex((p) => p.estado === "espera");
  const aPreparar = progresso.filter((p) => p.estado === "a_preparar");
  const concluidas = progresso.filter((p) => p.estado === "ok").length;
  const actual = indiceAEnviar >= 0
    ? progresso[indiceAEnviar]
    : esperaSeg !== null && indiceEmEspera >= 0
      ? progresso[indiceEmEspera]
      : null;
  const rotuloEnvio = actual
    ? indiceAEnviar >= 0
      ? `A enviar para ${actual.lista_nome}…`
      : `A aguardar para ${actual.lista_nome}…`
    : aPreparar.length > 0
      ? `A preparar ${aPreparar.length === 1 ? aPreparar[0].lista_nome : `${aPreparar.length} listas`}…`
      : isReal ? (revista ? "Enviar edição" : "Aprovar e enviar") : "Enviar teste";

  // Revisão (sempre disponível, mesmo com pontos por resolver): a página web
  // da edição e o artigo da crónica são só leituras — nada publica nem envia.
  const destinosQ = useQuery({
    queryKey: ["revista-destinos", edicaoId],
    queryFn: () => estadoDestinosFn({ data: { edicao_id: edicaoId } }),
    enabled: !!revista && aberto,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const baseQ = useQuery({
    queryKey: ["edicoes-base-url"],
    queryFn: () => baseUrlEdicoesFn(),
    enabled: !!revista && aberto,
    staleTime: 5 * 60_000,
  });
  const webPublica = destinosQ.data?.web.estado === "publica";
  const base = (baseQ.data ?? "").replace(/\/$/, "");
  const urlCronica = (destinosQ.data?.cronica.url ?? "").trim();
  const cronicaPublicada = !!urlCronica && destinosQ.data?.cronica.estado === "publicada";

  // Também se verifica prontidão nos testes: devem provar a experiência pública
  // completa, não apenas a composição da mensagem.
  const prontidaoQ = useQuery({
    queryKey: ["prontidao-revista", edicaoId, [...listasSel].sort().join(",")],
    queryFn: () => prontidaoRevistaFn({ data: { edicao_id: edicaoId, lista_ids: listasSel } }),
    enabled: !!revista && aberto && escolhidas.length > 0,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const prontidao = revista ? prontidaoQ.data ?? null : null;
  // Os bloqueios rígidos (só os dos Briefs e o endereço da edição web) não são
  // confirmáveis: o botão fica inactivo. Tudo o resto avisa e pede a
  // confirmação extra («Enviar mesmo assim»).
  const rigidos = prontidao ? bloqueiosRigidosDe(prontidao.areas) : [];
  const avisos = [...new Set([...problemas, ...(prontidao ? avisosConfirmaveisDe(prontidao.areas) : [])])];
  const [avisosPendentes, setAvisosPendentes] = useState<null | "disparar" | "agendar">(null);
  const confirmarAvisos = () => {
    const accao = avisosPendentes;
    setAvisosPendentes(null);
    if (accao === "disparar") disparar.mutate({ publicarConteudos: revista === true });
    if (accao === "agendar") agendar.mutate();
  };
  const precisaPublicar = !!revista && (!cronicaPublicada || !webPublica);
  const iniciarDisparo = () => (avisos.length > 0
    ? setAvisosPendentes("disparar")
    : disparar.mutate({ publicarConteudos: revista === true }));
  const pedirDisparo = () => (precisaPublicar ? setConfirmarPublicacao(true) : iniciarDisparo());
  const pedirAgendamento = () => (avisos.length > 0 ? setAvisosPendentes("agendar") : agendar.mutate());

  const podeEnviar =
    escolhidas.length > 0 && numOk && !bloqueioCurador && !emCurso &&
    rigidos.length === 0 &&
    !(revista && escolhidas.length > 0 && prontidaoQ.isPending);

  const areaEmail = prontidao?.areas.find((a) => a.chave === "email");
  const areaConteudo = prontidao?.areas.find((a) => a.chave === "editorial");
  const estadoArea = (estado?: string, severidade?: string): EstadoVerificacao => {
    if (prontidaoQ.isPending) return "a_verificar";
    if (estado === "pronta") return "pronto";
    if (estado === "bloqueada" && severidade === "bloqueio") return "bloqueado";
    return "atencao";
  };


  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!emCurso) onAberto(v); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[820px] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
          <DialogTitle className="text-[22px]">Enviar a edição #{numero}</DialogTitle>
          <DialogDescription className="text-[14.5px]">
            {isReal
              ? "Estão escolhidas listas reais: os subscritores vão receber o email."
              : "Só listas de teste seleccionadas — nada segue para subscritores."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-7">

        {revista && (
          <section>
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Checklist de prontidão</p>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground">Automático</span>
            </div>
            <div className="space-y-2.5">
              <ItemVerificacao
                estado={estadoArea(areaEmail?.estado, areaEmail?.severidade)}
                titulo="Email montado"
                detalhe={areaEmail?.mensagem ?? (prontidaoQ.isError ? "Não foi possível confirmar o email." : "A confirmar assunto e composição final…")}
              />
              <ItemVerificacao
                estado={prontidaoQ.isPending ? "a_verificar" : cronicaPublicada ? "pronto" : "atencao"}
                titulo="Crónica pública e atualizada"
                detalhe={cronicaPublicada ? "O artigo está publicado com um endereço público válido." : "Será publicada ou atualizada após confirmação, antes do envio."}
              />
              <ItemVerificacao
                estado={prontidaoQ.isPending ? "a_verificar" : webPublica && areaConteudo?.estado === "pronta" ? "pronto" : areaConteudo?.severidade === "bloqueio" ? "bloqueado" : "atencao"}
                titulo="Página completa da edição pública"
                detalhe={webPublica && areaConteudo?.estado === "pronta"
                  ? "As notícias e todo o conteúdo estão públicos e prontos."
                  : areaConteudo?.estado !== "pronta"
                    ? areaConteudo?.mensagem ?? "Há conteúdo editorial por resolver."
                    : "O conteúdo está pronto; a página será publicada antes do envio."}
              />
              <ItemVerificacao
                estado={escolhidas.length > 0 ? "pronto" : "atencao"}
                titulo="Destino selecionado"
                detalhe={escolhidas.length > 0 ? `${escolhidas.length} destino${escolhidas.length === 1 ? "" : "s"} selecionado${escolhidas.length === 1 ? "" : "s"}.` : "Escolhe pelo menos um destino para continuar."}
              />
            </div>
          </section>
        )}

        {revista && (
          <section>
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rever antes de enviar</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline"
                type="button" onClick={() => abrirPrevia("edicao")}
                className="h-auto min-h-24 items-start justify-start whitespace-normal rounded-xl p-4 text-left"
              >
                <Globe className="mt-0.5 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold text-foreground">Ver a página web da edição</span>
                  <span className="mt-1 block text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                  {webPublica
                    ? "Abre a edição com todas as notícias, tal como está publicada."
                    : "Pré-visualização interna — a edição ainda não está publicada."}
                  </span>
                </span>
              </Button>

              <Button variant="outline"
                type="button" onClick={() => abrirPrevia("cronica")}
                className="h-auto min-h-24 items-start justify-start whitespace-normal rounded-xl p-4 text-left"
              >
                <FileText className="mt-0.5 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold text-foreground">Ver a crónica como vai para o site</span>
                  <span className="mt-1 block text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                  {cronicaPublicada
                    ? "Já está publicada em FredericoCarvalho.pt — abre também a ligação ao site."
                    : urlCronica
                      ? "O artigo ainda é rascunho no site — abre a pré-visualização interna."
                      : "Ainda não há artigo em FredericoCarvalho.pt — abre a pré-visualização, sem publicar nada."}
                  </span>
                </span>
              </Button>
            </div>
          </section>
        )}

        {problemas.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-[14.5px] font-semibold text-destructive">
              <AlertTriangle size={16} /> {problemas.length} ponto(s) por resolver
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] text-muted-foreground">
              {problemas.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Destino</p>
          {activas.length === 0 && (
            <p className="text-[14px] text-muted-foreground">
              Não há listas activas. Configura-as em Definições.
            </p>
          )}
          <div className="space-y-2.5">
            {activas.map((l) => {
              const real = l.tipo === "real";
              const desactivar = (real && !isAdmin) || emCurso;
              const sel = listasSel.includes(l.id);
              return (
                <Button variant="outline"
                  key={l.id} type="button" role="checkbox" aria-checked={sel} disabled={desactivar}
                  onClick={() => setListasSel((p) => p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id])}
                  className={`h-auto w-full justify-between whitespace-normal rounded-xl border-2 p-4 text-left ${
                    sel ? "border-estado-pronto bg-estado-pronto-suave" : "border-border bg-card hover:border-estado-pronto-borda"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {real ? <Radio className="text-estado-falta" /> : <TestTube2 className="text-estado-pronto" />}
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{real ? "Real" : "Teste"}</span>
                      <span className="mt-0.5 block text-[14.5px] font-semibold text-foreground">{l.nome}</span>
                    </span>
                    {real && !isAdmin && <Lock size={12} className="text-muted-foreground" />}
                  </span>
                  {sel ? <CheckCircle2 className="shrink-0 text-estado-pronto" /> : <Circle className="shrink-0 text-muted-foreground" />}
                </Button>
              );
            })}
          </div>
        </div>

        {isReal && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
              Confirma o número da edição para libertar o envio real
            </span>
            <input
              value={confirmNumero} onChange={(e) => setConfirmNumero(e.target.value)}
              inputMode="numeric" placeholder={String(numero)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px]"
            />
          </label>
        )}

        {progresso.length > 0 && (
          <div className="space-y-2.5" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-[12.5px] font-semibold text-muted-foreground">
              <span>{emCurso ? rotuloEnvio : `${concluidas} de ${progresso.length} listas concluídas`}</span>
              {actual && <span>Lista {(indiceAEnviar >= 0 ? indiceAEnviar : indiceEmEspera) + 1} de {progresso.length}</span>}
            </div>
          <ul className="space-y-1.5">
            {progresso.map((p) => (
              <li key={p.lista_id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[14px]">
                <span className="font-medium text-foreground">{p.lista_nome}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {p.estado === "ok" && <><CheckCircle2 size={15} className="text-emerald-600" /> Enviada</>}
                  {p.estado === "a_enviar" && <><Loader2 size={15} className="animate-spin" /> A enviar agora…</>}
                  {p.estado === "a_preparar" && <><Loader2 size={15} className="animate-spin" /> A preparar…</>}
                  {p.estado === "espera" && "Em espera"}
                  {p.estado === "erro" && (
                    <>
                      <span className="text-destructive">{p.erro ?? "Falhou"}</span>
                      <button
                        type="button" onClick={() => repetirLista.mutate(p.lista_id)} disabled={repetirLista.isPending}
                        className="rounded-md border border-border px-2 py-1 text-[12.5px] font-semibold text-foreground"
                      >
                        Repetir
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          </div>
        )}

        {esperaSeg !== null && (
          <p className="text-[14px] text-muted-foreground">Pausa entre listas: {esperaSeg}s…</p>
        )}
        {resultadoFinal && (
          <p className="rounded-xl border border-estado-pronto-borda bg-estado-pronto-suave p-4 text-[14px] font-semibold text-estado-pronto" role="status">
            <CheckCircle2 size={17} className="mr-2 inline" />
            {resultadoFinal}
          </p>
        )}
        {erro && <p className="text-[14px] text-destructive">{erro}</p>}

        {rigidos.length > 0 && (
          <p className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-[13.5px] font-semibold text-destructive">
            Há pontos obrigatórios nos Briefs. Resolve-os no editor antes de enviar.
          </p>
        )}

        </div>

        <div className="sticky bottom-0 space-y-4 border-t border-border bg-card px-5 py-5 sm:px-8">
        <div className="flex flex-wrap gap-2">
          {revista && isReal && (
            <button
              type="button" disabled={emCurso} onClick={() => onAberto(false)}
              className="rounded-2xl border border-border px-5 py-3.5 text-[15px] font-semibold text-foreground disabled:opacity-55"
            >
              Cancelar
            </button>
          )}
          <Button
            type="button" disabled={!podeEnviar}
            onClick={pedirDisparo}
            className="h-auto min-h-12 flex-1 whitespace-normal rounded-xl px-4 py-2.5 text-[16px] leading-snug"
          >
            {emCurso && <Loader2 size={18} className="animate-spin" />}
            {emCurso ? rotuloEnvio : isReal ? (revista ? "Enviar edição" : "Aprovar e enviar") : "Enviar teste"}
          </Button>
        </div>

        {bloqueioCurador && (
          <p className="text-[13px] text-muted-foreground">Só um administrador pode disparar envios reais.</p>
        )}

        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <CalendarClock size={13} /> Ou agenda
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local" value={agendarQuando} onChange={(e) => setAgendarQuando(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-[15px]"
            />
            <button
              type="button"
              disabled={agendar.isPending || !agendarQuando || escolhidas.length === 0 || !numOk || bloqueioCurador}
              onClick={pedirAgendamento}
              className="rounded-xl border border-border px-3.5 py-2 text-[14.5px] font-semibold text-foreground disabled:opacity-55"
            >
              {agendar.isPending ? "A agendar…" : "Agendar envio"}
            </button>
          </div>
        </div>
        </div>
        {avisosPendentes && (
          <AvisoChecklistModal
            itensEmFalta={avisos.map((a, i) => ({
              // chave única só para o React; o modal usa apenas o rótulo
              chave: `aviso-${i}` as ItemChecklist["chave"],
              verde: false,
              nivel: "ambar" as const,
              rotulo: a,
              destino: "",
            }))}
            onConfirmar={confirmarAvisos}
            onCancelar={() => setAvisosPendentes(null)}
          />
        )}
      </DialogContent>
      {confirmarPublicacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/45 px-4" onClick={() => setConfirmarPublicacao(false)}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[18px] font-semibold text-foreground">Preparar e publicar antes do envio?</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              A crónica será publicada ou atualizada e a página completa da edição ficará pública, mas fora dos motores de busca. Só depois de ambas responderem será enviado o teste.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmarPublicacao(false)}>Cancelar</Button>
              <Button onClick={() => { setConfirmarPublicacao(false); iniciarDisparo(); }}>Preparar e continuar</Button>
            </div>
          </div>
        </div>
      )}
      {previa && (
        <PreVisualizarEdicao
          edicaoId={edicaoId}
          numero={numero}
          vistaInicial={previa}
          urlPublica={webPublica && base ? `${base}/edicoes/${numero}` : undefined}
          urlCronica={urlCronica || undefined}
          cronicaRascunho={!!urlCronica && !cronicaPublicada}
          onClose={fecharPrevia}
        />
      )}
    </Dialog>
  );
}
