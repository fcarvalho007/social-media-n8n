import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveEstado = "idle" | "a-guardar" | "guardado" | "erro";

export interface AutoSaveApi {
  estado: AutoSaveEstado;
  err: string | null;
  /** Há uma alteração por confirmar na base de dados. */
  pendente: boolean;
  /** Grava imediatamente o que estiver pendente. */
  flush: () => Promise<void>;
  /** Repete a última gravação falhada. */
  repetir: () => Promise<void>;
}

/**
 * Autosave com atraso, à prova de:
 *
 * - **hidratação** — enquanto `enabled` for falso o valor observado passa a ser
 *   a nova referência («já gravado»), pelo que aplicar o valor remoto ao estado
 *   local nunca provoca gravação;
 * - **respostas fora de ordem** — cada gravação leva um número de sequência e
 *   uma resposta antiga nunca sobrepõe o resultado de uma mais recente;
 * - **troca de contexto** (por exemplo, mudar de edição) — o pendente é
 *   descarregado com o contexto em que foi criado, e só depois a referência é
 *   reiniciada para o novo contexto;
 * - **saída da página** — o pendente é gravado ao desmontar e o navegador avisa
 *   enquanto houver escrita por confirmar.
 */
export function useAutoSave<T>(
  value: T,
  saveFn: (v: T, contexto?: string) => Promise<void>,
  opts: { delay?: number; enabled?: boolean; contexto?: string } = {},
): AutoSaveApi {
  const { delay = 800, enabled = true, contexto } = opts;
  const [estado, setEstado] = useState<AutoSaveEstado>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const okTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(saveFn);
  saveRef.current = saveFn;

  /** Última alteração por gravar, com o contexto capturado no momento. */
  const porGravar = useRef<{ v: T; ctx?: string } | null>(null);
  /** Valor que a base já conhece. */
  const referencia = useRef<T>(value);
  const ctxRef = useRef<string | undefined>(contexto);
  const seq = useRef(0);
  const ultimaAplicada = useRef(0);

  const executar = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const alvo = porGravar.current;
    if (!alvo) return;
    porGravar.current = null;
    const meu = ++seq.current;
    setEstado("a-guardar");
    setErr(null);
    try {
      await saveRef.current(alvo.v, alvo.ctx);
      if (meu < ultimaAplicada.current) return; // resposta fora de ordem
      ultimaAplicada.current = meu;
      referencia.current = alvo.v;
      if (!porGravar.current) setPendente(false);
      setEstado("guardado");
      if (okTimer.current) clearTimeout(okTimer.current);
      okTimer.current = setTimeout(() => setEstado("idle"), 2000);
    } catch (e) {
      if (meu < ultimaAplicada.current) return;
      ultimaAplicada.current = meu;
      // O texto local mantém-se e continua pendente: nada foi confirmado.
      if (!porGravar.current) porGravar.current = alvo;
      setPendente(true);
      console.error("[useAutoSave]", e);
      setErr(e instanceof Error ? e.message : String(e));
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    // Troca de contexto: descarrega o pendente do contexto anterior e reinicia.
    if (ctxRef.current !== contexto) {
      void executar();
      ctxRef.current = contexto;
      referencia.current = value;
      porGravar.current = null;
      setPendente(false);
      setEstado("idle");
      setErr(null);
      return;
    }
    // Ainda a hidratar (ou bloqueado): o valor observado é a nova referência.
    if (!enabled) {
      referencia.current = value;
      return;
    }
    if (Object.is(value, referencia.current)) return;
    porGravar.current = { v: value, ctx: contexto };
    setPendente(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void executar(); }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, enabled, delay, contexto, executar]);

  // Gravar o pendente ao desmontar (mudança de secção/edição, navegação).
  useEffect(() => () => { void executar(); }, [executar]);

  // Aviso do navegador enquanto houver escrita por confirmar.
  useEffect(() => {
    if (!pendente) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [pendente]);

  return { estado, err, pendente, flush: executar, repetir: executar };
}
