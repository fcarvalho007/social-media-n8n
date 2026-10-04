import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

/** Entrada normalizada: unicode + termos de pesquisa PT e EN. */
interface EmojiItem {
  unicode: string;
  label: string;
  grupo: number;
  termos: string;
}

interface CompactEmoji {
  hexcode: string;
  unicode: string;
  label: string;
  group?: number;
  order?: number;
  tags?: string[];
}

const GRUPOS: { id: number; nome: string }[] = [
  { id: 0, nome: "Rostos" },
  { id: 1, nome: "Pessoas" },
  { id: 3, nome: "Natureza" },
  { id: 4, nome: "Comida" },
  { id: 5, nome: "Viagens" },
  { id: 6, nome: "Actividades" },
  { id: 7, nome: "Objectos" },
  { id: 8, nome: "Símbolos" },
  { id: 9, nome: "Bandeiras" },
];

const CHAVE_RECENTES = "ds:emoji:recentes";
const LIMITE_RESULTADOS = 120;

function semAcentos(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

let cache: EmojiItem[] | null = null;
let aCarregar: Promise<EmojiItem[]> | null = null;

async function carregarEmojis(): Promise<EmojiItem[]> {
  if (cache) return cache;
  if (aCarregar) return aCarregar;
  aCarregar = (async () => {
    const [pt, en] = await Promise.all([
      import("emojibase-data/pt/compact.json"),
      import("emojibase-data/en/compact.json"),
    ]);
    const listaPt = (pt.default ?? pt) as unknown as CompactEmoji[];
    const listaEn = (en.default ?? en) as unknown as CompactEmoji[];
    const porHex = new Map<string, CompactEmoji>();
    for (const e of listaEn) porHex.set(e.hexcode, e);

    const itens: EmojiItem[] = [];
    for (const e of listaPt) {
      if (e.group === undefined || e.group === 2) continue;
      if (!GRUPOS.some((g) => g.id === e.group)) continue;
      const ingles = porHex.get(e.hexcode);
      const termos = semAcentos(
        [e.label, ...(e.tags ?? []), ingles?.label ?? "", ...(ingles?.tags ?? [])].join(" "),
      );
      itens.push({ unicode: e.unicode, label: e.label, grupo: e.group, termos });
    }
    cache = itens;
    return itens;
  })();
  return aCarregar;
}

function lerRecentes(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_RECENTES);
    const arr = bruto ? (JSON.parse(bruto) as unknown) : null;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 24) : [];
  } catch {
    return [];
  }
}

function guardarRecentes(lista: string[]) {
  try {
    localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista.slice(0, 24)));
  } catch {
    /* armazenamento indisponível: os recentes são opcionais */
  }
}

interface Props {
  linha: string;
  esbatido: string;
  destaque: string;
  onEscolher: (emoji: string) => void;
  onFechar: () => void;
}

/** Painel de emojis com catálogo completo e pesquisa bilingue (PT/EN). */
export function EmojiPicker({ linha, esbatido, destaque, onEscolher, onFechar }: Props) {
  const [itens, setItens] = useState<EmojiItem[] | null>(cache);
  const [erro, setErro] = useState(false);
  const [procura, setProcura] = useState("");
  const [grupo, setGrupo] = useState<number>(GRUPOS[0]!.id);
  const [recentes, setRecentes] = useState<string[]>([]);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentes(lerRecentes());
    let vivo = true;
    carregarEmojis()
      .then((r) => { if (vivo) setItens(r); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const clique = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) onFechar();
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("mousedown", clique);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clique);
      document.removeEventListener("keydown", tecla);
    };
  }, [onFechar]);

  const consulta = semAcentos(procura.trim());

  const visiveis = useMemo(() => {
    if (!itens) return [];
    if (consulta.length > 0) {
      const res: EmojiItem[] = [];
      for (const it of itens) {
        if (it.termos.includes(consulta)) res.push(it);
        if (res.length >= LIMITE_RESULTADOS) break;
      }
      return res;
    }
    return itens.filter((it) => it.grupo === grupo);
  }, [itens, consulta, grupo]);

  const escolher = (emoji: string) => {
    const nova = [emoji, ...recentes.filter((e) => e !== emoji)].slice(0, 24);
    setRecentes(nova);
    guardarRecentes(nova);
    onEscolher(emoji);
  };

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-label="Escolher emoji"
      className="absolute left-2 top-full mt-1 z-20 w-[320px] rounded-xl shadow-xl"
      style={{ background: "#FFFFFF", border: `1px solid ${linha}` }}
    >
      <div className="p-2" style={{ borderBottom: `1px solid ${linha}` }}>
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: esbatido }} />
          <input
            autoFocus
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Pesquisar em português ou inglês…"
            aria-label="Pesquisar emoji em português ou inglês"
            className="w-full text-xs pl-7 pr-2 py-1.5 rounded-md"
            style={{ border: `1px solid ${linha}` }}
          />
        </div>
      </div>

      {consulta.length === 0 && (
        <div className="flex gap-1 px-2 py-1.5 overflow-x-auto" style={{ borderBottom: `1px solid ${linha}` }}>
          {GRUPOS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGrupo(g.id)}
              aria-pressed={grupo === g.id}
              className="text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap transition-colors"
              style={{
                color: grupo === g.id ? "#FFFFFF" : esbatido,
                background: grupo === g.id ? destaque : "transparent",
              }}
            >
              {g.nome}
            </button>
          ))}
        </div>
      )}

      {consulta.length === 0 && recentes.length > 0 && (
        <div className="px-2 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: esbatido }}>
            Usados recentemente
          </p>
          <div className="flex flex-wrap gap-0.5">
            {recentes.map((e) => (
              <BotaoEmoji key={`r-${e}`} emoji={e} rotulo={e} onEscolher={escolher} />
            ))}
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto p-2">
        {erro && <p className="text-xs py-6 text-center" style={{ color: esbatido }}>Não foi possível carregar os emojis.</p>}
        {!erro && !itens && <p className="text-xs py-6 text-center" style={{ color: esbatido }}>A carregar emojis…</p>}
        {!erro && itens && visiveis.length === 0 && (
          <p className="text-xs py-6 text-center" style={{ color: esbatido }}>Sem resultados para «{procura.trim()}».</p>
        )}
        <div className="flex flex-wrap gap-0.5">
          {visiveis.map((it) => (
            <BotaoEmoji key={it.unicode + it.grupo} emoji={it.unicode} rotulo={it.label} onEscolher={escolher} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BotaoEmoji({ emoji, rotulo, onEscolher }: { emoji: string; rotulo: string; onEscolher: (e: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEscolher(emoji)}
      title={rotulo}
      aria-label={rotulo}
      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[19px] leading-none hover:bg-muted"
    >
      {emoji}
    </button>
  );
}
