import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIAS, EMOJI_LIBRARY, pesquisarEmojis, sugerirEmoji } from "./emoji";

interface Props {
  valor: string;
  onEscolher: (emoji: string) => void;
  disabled?: boolean;
  /** Contexto para gerar sugestão automática quando o picker abre sem valor. */
  contexto?: { nome?: string; descricao?: string };
}

const T = {
  card: "#FFFFFF",
  line: "#E4E7EC",
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  soft: "#F9FAFB",
  accent: "#4F46E5",
  accentSoft: "#EEF2FF",
};

export function EmojiPicker({ valor, onEscolher, disabled, contexto }: Props) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sugestao = useMemo(() => {
    if ((valor ?? "").trim() !== "") return null;
    const nome = contexto?.nome?.trim() ?? "";
    const desc = contexto?.descricao?.trim() ?? "";
    if (!nome && !desc) return null;
    const e = sugerirEmoji(nome, desc);
    return e === "✨" ? null : e;
  }, [valor, contexto?.nome, contexto?.descricao]);

  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onDoc = (ev: MouseEvent) => {
      if (!popRef.current || !btnRef.current) return;
      const t = ev.target as Node;
      if (popRef.current.contains(t) || btnRef.current.contains(t)) return;
      setAberto(false);
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  const resultados = useMemo(() => {
    let base = q.trim() ? pesquisarEmojis(q) : EMOJI_LIBRARY;
    if (!q.trim() && categoria !== "Todas") base = base.filter((e) => e.categoria === categoria);
    return base;
  }, [q, categoria]);

  const escolher = (e: string) => {
    onEscolher(e);
    setAberto(false);
    setQ("");
  };

  const mostrar = (valor ?? "").trim() || "✨";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setAberto((s) => !s)}
        className="w-14 h-11 text-center text-xl rounded-lg disabled:opacity-50 transition-colors"
        style={{
          background: T.card,
          border: `1px solid ${aberto ? T.accent : T.line}`,
          boxShadow: aberto ? `0 0 0 3px ${T.accentSoft}` : "none",
        }}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title="Escolher emoji"
      >
        {mostrar}
      </button>

      {aberto && (
        <div
          ref={popRef}
          className="absolute z-30 mt-2 rounded-xl shadow-lg"
          style={{
            background: T.card,
            border: `1px solid ${T.line}`,
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
          }}
          role="dialog"
          aria-label="Escolher emoji"
        >
          {/* Header: pesquisa */}
          <div className="p-3 border-b" style={{ borderColor: T.line }}>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.faint }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar (ex.: vídeo, dados, código)…"
                className="w-full text-sm rounded-md pl-8 pr-8 py-2"
                style={{ background: T.soft, border: `1px solid ${T.line}`, color: T.ink }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => { setQ(""); inputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                  style={{ color: T.muted }}
                  aria-label="Limpar pesquisa"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sugestão auto */}
            {sugestao && !q && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: T.accentSoft, color: T.accent }}>Sugestão</span>
                <button
                  type="button"
                  onClick={() => escolher(sugestao)}
                  className="text-xl w-9 h-9 rounded-md hover:scale-110 transition-transform"
                  style={{ background: T.soft, border: `1px solid ${T.line}` }}
                  title="Usar sugestão automática"
                >
                  {sugestao}
                </button>
                <span className="text-[11px]" style={{ color: T.faint }}>com base no nome/descrição</span>
              </div>
            )}
          </div>

          {/* Categorias (só sem query) */}
          {!q && (
            <div className="px-3 pt-2 pb-1 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              {(["Todas", ...CATEGORIAS] as string[]).map((c) => {
                const activa = categoria === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className="text-[11px] font-semibold px-2 py-1 rounded whitespace-nowrap"
                    style={{
                      background: activa ? T.accent : T.soft,
                      color: activa ? "#FFFFFF" : T.muted,
                      border: `1px solid ${activa ? T.accent : T.line}`,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          {/* Grelha */}
          <div className="p-2 max-h-[280px] overflow-y-auto">
            {resultados.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: T.muted }}>
                Sem resultados para "{q}".
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {resultados.map((e, i) => (
                  <button
                    key={`${e.emoji}-${i}`}
                    type="button"
                    onClick={() => escolher(e.emoji)}
                    className="text-xl w-9 h-9 rounded-md hover:bg-gray-100 transition-colors"
                    title={e.palavras.slice(0, 3).join(", ")}
                    aria-label={e.palavras[0]}
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
