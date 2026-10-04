import { useEffect, useRef, useState } from "react";
import { Pencil, Sparkles, Loader2, Check, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { sugerirAssunto, type SugestaoAssunto, type TecnicaAssunto } from "@/newsletter/lib/newsletter-ia.functions";
import { avaliarAssuntoSpam } from "./checklist";

const ROTULO_TECNICA: Record<TecnicaAssunto, string> = {
  curiosidade: "💭 Curiosidade",
  dado_concreto: "📊 Dado concreto",
  cronica: "✍️ Da crónica",
};

const T = {
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  line: "#E4E7EC",
  lineStrong: "#D0D5DD",
  shell: "#FFFFFF",
  softBg: "#F9FAFB",
} as const;

interface Props {
  valor: string;
  onAlterar: (novo: string) => void;
  bloqueado: boolean;
  edicaoId: string;
  onAceitouSugestao?: (assunto: string) => void;
  onAplicouSugestao?: () => void;
  preheader?: string;
  onAlterarPreheader?: (novo: string) => void;
}


const MIN_CHARS = 10;
const MAX_CHARS = 90;

type Validacao = { ok: true } | { ok: false; erro: string };

function validar(rascunho: string): Validacao {
  const limpo = rascunho.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (limpo.length === 0) return { ok: false, erro: "O assunto não pode ficar vazio." };
  if (limpo.length < MIN_CHARS)
    return { ok: false, erro: `O assunto tem de ter pelo menos ${MIN_CHARS} caracteres.` };
  if (limpo.length > MAX_CHARS)
    return { ok: false, erro: `Máximo ${MAX_CHARS} caracteres — reduz ${limpo.length - MAX_CHARS}.` };
  return { ok: true };
}

export function AssuntoField({ valor, onAlterar, bloqueado, edicaoId, onAceitouSugestao, onAplicouSugestao, preheader, onAlterarPreheader }: Props) {
  const [modo, setModo] = useState<"leitura" | "edicao">("leitura");
  const [rascunho, setRascunho] = useState(valor);
  const [erro, setErro] = useState<string | null>(null);
  const [aSugerir, setASugerir] = useState(false);
  const [sugestoes, setSugestoes] = useState<SugestaoAssunto[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modo === "leitura") setRascunho(valor);
  }, [valor, modo]);

  useEffect(() => {
    if (modo === "edicao") {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      });
    }
  }, [modo]);

  const guardar = () => {
    const v = validar(rascunho);
    if (!v.ok) {
      setErro(v.erro);
      toast.error(v.erro);
      return;
    }
    const limpo = rascunho.trim();
    if (limpo !== valor.trim()) onAlterar(limpo);
    setErro(null);
    setModo("leitura");
  };
  const cancelar = () => {
    setRascunho(valor);
    setErro(null);
    setModo("leitura");
  };

  const pedirSugestoes = async (base?: SugestaoAssunto) => {
    if (aSugerir || bloqueado) return;
    setASugerir(true);
    setSugestoes(null);
    try {
      const r = await sugerirAssunto({ data: { edicaoId, ...(base ? { aperfeicoar: { assunto: base.texto, preheader: base.preheader } } : {}) } });
      setSugestoes(r.sugestoes);
      if (base) toast.success("Foram criadas três versões aperfeiçoadas.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falhou a gerar sugestões";
      toast.error(msg);
    } finally {
      setASugerir(false);
    }
  };

  const escolher = (s: SugestaoAssunto) => {
    const limpo = s.texto.trim();
    const v = validar(limpo);
    setRascunho(limpo);
    onAlterar(limpo);
    if (s.preheader && onAlterarPreheader) onAlterarPreheader(s.preheader.trim());
    setSugestoes(null);
    if (v.ok) {
      setErro(null);
      onAceitouSugestao?.(limpo);
      onAplicouSugestao?.();
      setModo("leitura");
    } else {
      setErro(v.erro);
      setModo("edicao");
    }

  };

  const avisosSpam = avaliarAssuntoSpam(modo === "edicao" ? rascunho : valor);
  const validacaoActual = validar(rascunho);
  const invalido = !validacaoActual.ok;
  const contador = rascunho.length;
  const corContador = contador > MAX_CHARS ? "#B42318" : contador > 60 ? "#B54708" : T.faint;


  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <label className="text-[13px] font-semibold flex items-center gap-1" style={{ color: T.muted }}>
          <Pencil size={12} /> Assunto do email
        </label>
        {!bloqueado && modo === "leitura" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModo("edicao")}
              className="inline-flex items-center gap-1.5 text-[13px] sm:text-xs font-semibold h-10 sm:h-8 px-3 rounded-md hover:bg-black/5 transition-colors"
              style={{ color: T.muted, border: `1px solid ${T.line}` }}
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              type="button"
              onClick={() => { void pedirSugestoes(); }}
              disabled={aSugerir}
              className="ds-gradient inline-flex items-center gap-1.5 text-[13px] sm:text-xs font-semibold h-10 sm:h-8 px-3 rounded-md text-white disabled:opacity-60 transition-opacity"
              title="Analisa a edição actual e sugere títulos"
            >
              {aSugerir ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {aSugerir ? "A analisar…" : "Sugerir com IA"}
            </button>
          </div>
        )}
      </div>

      {modo === "leitura" ? (
        <div
          className="rounded-lg px-4 py-3.5"
          style={{ border: `1px solid ${T.line}`, background: T.softBg }}
        >
          {valor.trim() ? (
            <p className="text-[16px] sm:text-[15px] font-semibold leading-snug" style={{ color: T.ink }}>{valor}</p>
          ) : (
            <p className="text-[14px] italic" style={{ color: T.faint }}>
              Ainda sem assunto definido. Clica em «Editar» ou usa «Sugerir com IA».
            </p>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            value={rascunho}
            disabled={bloqueado}
            aria-invalid={invalido}
            onChange={(e) => { setRascunho(e.target.value); if (erro) setErro(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); guardar(); }
              if (e.key === "Escape") { e.preventDefault(); cancelar(); }
            }}
            placeholder="Ex.: IA generativa entra nas redes que já usas todos os dias"
            className="w-full text-base font-medium rounded-lg h-12 sm:h-11 px-3.5 disabled:opacity-50 focus:outline-none focus:ring-2"
            style={{
              border: `1px solid ${erro ? "#F04438" : T.lineStrong}`,
              background: T.shell,
              color: T.ink,
              boxShadow: erro ? "0 0 0 3px rgba(240,68,56,0.12)" : undefined,
            }}
          />
          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
            <span className="text-[12px]" style={{ color: corContador }}>
              {contador}/{MAX_CHARS} caracteres {contador > MAX_CHARS ? "· demasiado longo" : contador < 20 ? "· pode ser mais descritivo" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelar}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold h-10 sm:h-8 px-3 rounded-md hover:bg-black/5"
                style={{ color: T.muted, border: `1px solid ${T.line}` }}
              >
                <X size={13} /> Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={invalido}
                title={invalido && !validacaoActual.ok ? validacaoActual.erro : undefined}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold h-10 sm:h-8 px-3.5 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#101828" }}
              >
                <Check size={13} /> Guardar
              </button>
            </div>
          </div>
          {erro && (
            <p className="text-[12px] mt-2 font-medium" style={{ color: "#B42318" }} aria-live="polite">
              {erro}
            </p>
          )}
        </div>

      )}

      {avisosSpam.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" aria-live="polite">
          {avisosSpam.map((a, i) => (
            <li
              key={i}
              className="text-[12px] leading-snug rounded-md px-2.5 py-1.5"
              style={{
                color: a.nivel === "vermelho" ? "#B42318" : "#B54708",
                background: a.nivel === "vermelho" ? "rgba(240,68,56,0.08)" : "rgba(181,71,8,0.08)",
              }}
            >
              {a.texto}
            </li>
          ))}
        </ul>
      )}

      {sugestoes && (
        <div className="mt-3 rounded-lg p-3" style={{ border: `1px solid ${T.line}`, background: "#FCFAFF" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#6D28D9" }}>
              <Wand2 size={11} /> Sugestões da IA
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { void pedirSugestoes(); }} disabled={aSugerir}
                className="text-[11px] font-semibold underline disabled:opacity-60" style={{ color: T.muted }}>
                Gerar outros pares
              </button>
              <button type="button" onClick={() => setSugestoes(null)}
                className="text-[11px] font-semibold" style={{ color: T.faint }}>
                Fechar
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {sugestoes.map((s, i) => {
              const forade = s.caracteres > 55;
              const corContador = forade ? "#B54708" : "#067647";
              const bgContador = forade ? "rgba(181,71,8,0.10)" : "rgba(6,118,71,0.10)";
              return (
                <li key={i}>
                  <div className="w-full rounded-md px-3 py-2.5" style={{ border: `1px solid ${T.line}`, background: T.shell }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: T.muted }}>
                        {ROTULO_TECNICA[s.tecnica]}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ color: corContador, background: bgContador }}
                        title={forade ? "Excede 55 caracteres" : "Dentro do intervalo ideal"}
                      >
                        {s.caracteres} chars
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug" style={{ color: T.ink }}>{s.texto}</p>
                    {s.preheader && (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
                        <span className="font-semibold">Pré-cabeçalho:</span> {s.preheader}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => { void pedirSugestoes(s); }} disabled={aSugerir}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60">
                        <Sparkles size={12} /> Aperfeiçoar com IA
                      </button>
                      <button type="button" onClick={() => escolher(s)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90">
                        <Check size={12} /> Usar este par
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] mt-2" style={{ color: T.faint }}>Usa um par ou aperfeiçoa-o primeiro. Ambos os campos continuam editáveis.</p>
        </div>
      )}
    </div>
  );
}
