// «Rever leituras» com dados reais.
//
// Princípio ético do sistema: a leitura escrita pela IA aparece pré-preenchida,
// mas só se torna «A minha leitura» pública depois de uma aprovação explícita.
// Editar uma leitura já aprovada revoga sempre a aprovação.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@/newsletter/shim/start";
import { CheckCircle2, Circle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/newsletter/features/newsletter/useAutoSave";
import type { EstadoBriefEdicao, IntencaoBriefUi } from "@/newsletter/lib/brief.functions";
import {
  aprovarLeituraBriefFn, gerarBriefFn, guardarLeituraBriefFn,
} from "@/newsletter/lib/brief.functions";

import type { AccoesBriefs } from "./BriefsDaEdicao";

const INTENCOES: Array<{ id: IntencaoBriefUi; rotulo: string }> = [
  { id: "mais_pragmatico", rotulo: "Mais pragmática" },
  { id: "mais_curto", rotulo: "Mais curta" },
  { id: "menos_opinativo", rotulo: "Menos opinativa" },
  { id: "outro_angulo", rotulo: "Outro ângulo" },
  { id: "simplificar", rotulo: "Simplificar" },
];

function Marca({ aprovada }: { aprovada: boolean }) {
  return aprovada
    ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
    : <Circle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />;
}

function Peca({
  b, bloqueado, accoes, onAbrir,
}: {
  b: EstadoBriefEdicao;
  bloqueado: boolean;
  accoes: AccoesBriefs;
  onAbrir: (id: string) => void;
}) {
  const guardar = useServerFn(guardarLeituraBriefFn);
  const aprovar = useServerFn(aprovarLeituraBriefFn);
  const gerar = useServerFn(gerarBriefFn);

  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState(b.leitura);
  const [aprovada, setAprovada] = useState(b.aprovada);
  const [aTrabalhar, setATrabalhar] = useState(false);
  const hidratado = useRef(false);

  // Só adopta o valor do servidor enquanto o campo não estiver a ser editado.
  useEffect(() => {
    if (!aberta) {
      setTexto(b.leitura);
      setAprovada(b.aprovada);
      hidratado.current = false;
    }
  }, [b.leitura, b.aprovada, aberta]);

  const autosave = useAutoSave(
    texto,
    async (v) => {
      const r = await guardar({ data: { id: b.briefId, texto: v } });
      if (r.revogou) {
        setAprovada(false);
        accoes.registar("Revogou aprovação da leitura", { brief: b.slug, motivo: "texto alterado" });
        toast.warning("A leitura foi alterada — volta a precisar de aprovação.");
        accoes.recarregar();
      }
    },
    { enabled: aberta && !bloqueado, contexto: b.briefId },
  );

  const abrir = () => {
    const novo = !aberta;
    setAberta(novo);
    if (novo) onAbrir(b.briefId);
  };

  const regenerar = async (intencao: IntencaoBriefUi) => {
    setATrabalhar(true);
    try {
      await autosave.flush();
      await gerar({ data: { id: b.briefId, componente: "leitura_sugerida", intencao } });
      accoes.registar("Regenerou a leitura sugerida", { brief: b.slug, intencao });
      accoes.recarregar();
      toast.success("Nova proposta de leitura.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setATrabalhar(false);
    }
  };

  const aprovarEsta = async () => {
    if (!texto.trim()) { toast.error("A leitura está vazia."); return; }
    setATrabalhar(true);
    try {
      await autosave.flush();
      await aprovar({ data: { id: b.briefId, texto } });
      setAprovada(true);
      accoes.registar("Aprovou a leitura", { brief: b.slug });
      accoes.recarregar();
      toast.success("Leitura aprovada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setATrabalhar(false);
    }
  };

  return (
    <li className="rounded-xl border border-border">
      <button
        type="button" onClick={abrir} aria-expanded={aberta}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
      >
        <Marca aprovada={aprovada} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug text-foreground">
            {b.titulo || b.slug}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
            {aprovada ? "Aprovada" : "Por rever"}
            {b.fontePublisher ? ` · ${b.fontePublisher}` : ""}
          </span>
        </span>
      </button>

      {aberta && (
        <div className="space-y-3 border-t border-border p-3.5">
          {b.em30.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Em 30 segundos
              </p>
              {b.em30.map((p, i) => (
                <p key={i} className="mt-1 text-[14px] leading-relaxed text-foreground">{p}</p>
              ))}
            </div>
          )}

          {b.porqueInteressa.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Porque interessa
              </p>
              <ul className="mt-1 space-y-1">
                {b.porqueInteressa.map((i, k) => (
                  <li key={k} className="text-[14px] leading-relaxed text-foreground">
                    <strong className="font-semibold">{i.rotulo}:</strong> {i.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Leitura sugerida {aprovada ? "· aprovada" : "· por aprovar"}
              </p>
              <span className="text-[11.5px] text-muted-foreground">
                {autosave.estado === "a-guardar" && "A guardar…"}
                {autosave.estado === "guardado" && "Guardado"}
                {autosave.estado === "erro" && (
                  <button type="button" onClick={() => void autosave.repetir()} className="text-amber-700 underline">
                    Não foi possível guardar — tentar de novo
                  </button>
                )}
              </span>
            </div>
            <Textarea
              value={texto} disabled={bloqueado}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              className="mt-1.5 font-serif text-[15px] leading-relaxed"
              placeholder="A tua leitura desta notícia."
            />
            {b.pullQuote && (
              <p className="mt-2 border-l-2 border-primary/40 pl-3 font-serif text-[14px] italic text-muted-foreground">
                {b.pullQuote}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button" disabled={bloqueado || aTrabalhar}
              onClick={() => void aprovarEsta()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.07] px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-45"
            >
              {aTrabalhar ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {aprovada ? "Aprovar de novo" : "Aprovar"}
            </button>
            {INTENCOES.map((i) => (
              <button
                key={i.id} type="button" disabled={bloqueado || aTrabalhar}
                onClick={() => void regenerar(i.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted disabled:opacity-45"
              >
                <RotateCcw size={12} /> {i.rotulo}
              </button>
            ))}
            {b.fonteUrl && (
              <a
                href={b.fonteUrl} target="_blank" rel="noreferrer"
                className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-primary hover:bg-muted"
              >
                Fonte original ↗
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function ReverLeituras({
  briefs, bloqueado, accoes,
}: {
  briefs: EstadoBriefEdicao[];
  bloqueado: boolean;
  accoes: AccoesBriefs;
}) {
  const destaques = useMemo(
    () => briefs.filter((b) => b.papel === "destaque" && b.estado !== "por_gerar"),
    [briefs],
  );
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [aAprovar, setAAprovar] = useState(false);
  const aprovar = useServerFn(aprovarLeituraBriefFn);

  const aprovadas = destaques.filter((b) => b.aprovada).length;
  const porAprovar = destaques.filter((b) => !b.aprovada);
  const todasRevistas = porAprovar.every((b) => abertas.has(b.briefId));

  const aprovarTodas = async () => {
    setAAprovar(true);
    try {
      for (const b of porAprovar) {
        await aprovar({ data: { id: b.briefId, texto: b.leitura } });
        accoes.registar("Aprovou a leitura", { brief: b.slug, origem: "aprovar todas" });
      }
      accoes.recarregar();
      toast.success("Leituras aprovadas.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAAprovar(false);
      setConfirmar(false);
    }
  };

  if (destaques.length === 0) {
    return (
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Ainda não há leituras para rever. Gera os Briefs dos Destaques e as propostas aparecem aqui,
        sempre por aprovar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted-foreground">
          <strong className="text-foreground">{aprovadas} de {destaques.length}</strong> leituras aprovadas.
          A proposta da IA nunca vai para o público sem a tua aprovação.
        </p>
        <button
          type="button"
          disabled={bloqueado || aAprovar || porAprovar.length === 0 || !todasRevistas}
          onClick={() => setConfirmar(true)}
          title={todasRevistas ? undefined : "Abre e revê cada leitura antes de aprovar todas."}
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold hover:bg-muted disabled:opacity-45"
        >
          Aprovar todas
        </button>
      </div>

      <ul className="space-y-2.5">
        {destaques.map((b) => (
          <Peca
            key={b.briefId} b={b} bloqueado={bloqueado} accoes={accoes}
            onAbrir={(id) => setAbertas((s) => new Set(s).add(id))}
          />
        ))}
      </ul>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar as leituras que faltam?</AlertDialogTitle>
            <AlertDialogDescription>
              Passam a ser publicadas como «A minha leitura», assinadas por ti.
              Podes continuar a editá-las — cada edição volta a pedir aprovação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void aprovarTodas(); }}>
              Aprovar {porAprovar.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
