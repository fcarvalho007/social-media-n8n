import { useEffect, useState, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, Check, Sparkles, Trash2 } from "lucide-react";
import { useAutoSave, type AutoSaveEstado } from "./useAutoSave";
import {
  actualizarSeccaoPersonalizada,
  removerSeccaoPersonalizada,
  type SeccaoRow,
  type SeccaoCor,
} from "./data";
import { COR_PRESETS, CORES_ORDENADAS, corDe } from "./seccoes";

/* Tokens partilhados com o resto do editor */
const T = {
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  line: "#E4E7EC",
  lineStrong: "#D0D5DD",
  card: "#FFFFFF",
  shell: "#F7F8FA",
  warn: "#B54708",
  warnSoft: "#FFFAEB",
  warnAccent: "#FDE68A",
};
const COR_PASSIVA = "#94A3B8";

interface FoldableProps {
  icon: ComponentType<{ size?: number; color?: string }>;
  titulo: string;
  contador?: number | string;
  secId: string;
  defaultOpen?: boolean;
  accent?: string;
  acao?: React.ReactNode;
  aviso?: React.ReactNode;
  children: React.ReactNode;
  foldOpen: Record<string, boolean>;
  setFoldOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
}

function Tick({ s, err, vazio }: { s: AutoSaveEstado; err: string | null; vazio?: boolean }) {
  const base = "inline-flex items-center gap-1 text-[11px] font-medium";
  if (s === "a-guardar") return <span className={base} style={{ color: "#667085" }}>A guardar…</span>;
  if (s === "guardado") return <span className={base} style={{ color: "#027A48" }}><Check size={10} /> Guardado</span>;
  if (s === "erro") return <span className={base} style={{ color: "#B42318" }} title={err ?? undefined}>Erro</span>;
  if (vazio) return <span className={base} style={{ color: "#98A2B3" }}>· por guardar</span>;
  return null;
}

export function SeccaoPersonalizadaCard({
  seccao,
  bloqueado,
  Foldable,
  foldOpen,
  setFoldOpen,
  onAcao,
  onRemovida,
}: {
  seccao: SeccaoRow;
  bloqueado: boolean;
  Foldable: ComponentType<FoldableProps>;
  foldOpen: Record<string, boolean>;
  setFoldOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  onAcao?: (msg: string) => void;
  onRemovida?: () => void;
}) {
  const activa = !!seccao.activo;

  const [titulo, setTitulo] = useState(seccao.titulo ?? "");
  const [texto, setTexto] = useState(seccao.texto ?? "");
  const [cor, setCor] = useState<SeccaoCor>((seccao.cor as SeccaoCor) ?? "indigo");
  const [textoBotao, setTextoBotao] = useState(seccao.texto_botao ?? "");
  const [urlBotao, setUrlBotao] = useState(seccao.url_botao ?? "");

  // Sincroniza quando a linha muda vinda do Realtime / modal
  useEffect(() => { setTitulo(seccao.titulo ?? ""); }, [seccao.id, seccao.titulo]);
  useEffect(() => { setTexto(seccao.texto ?? ""); }, [seccao.id, seccao.texto]);
  useEffect(() => { setCor((seccao.cor as SeccaoCor) ?? "indigo"); }, [seccao.id, seccao.cor]);
  useEffect(() => { setTextoBotao(seccao.texto_botao ?? ""); }, [seccao.id, seccao.texto_botao]);
  useEffect(() => { setUrlBotao(seccao.url_botao ?? ""); }, [seccao.id, seccao.url_botao]);

  const tituloAS = useAutoSave(titulo, async (v) => {
    await actualizarSeccaoPersonalizada(seccao.id, { titulo: v });
  });
  const textoAS = useAutoSave(texto, async (v) => {
    await actualizarSeccaoPersonalizada(seccao.id, { texto: v });
  });
  const textoBotaoAS = useAutoSave(textoBotao, async (v) => {
    await actualizarSeccaoPersonalizada(seccao.id, { texto_botao: v.trim() ? v.trim() : null });
  });
  const urlBotaoAS = useAutoSave(urlBotao, async (v) => {
    await actualizarSeccaoPersonalizada(seccao.id, { url_botao: v.trim() ? v.trim() : null });
  });

  async function escolherCor(nova: SeccaoCor) {
    if (bloqueado || nova === cor) return;
    setCor(nova);
    try {
      await actualizarSeccaoPersonalizada(seccao.id, { cor: nova });
      onAcao?.(`Mudou cor da secção «${titulo || "personalizada"}» para ${COR_PRESETS[nova].nome}`);
    } catch (e) {
      console.error(e);
    }
  }

  async function remover() {
    if (bloqueado) return;
    const ok = window.confirm(`Remover a secção «${titulo || "personalizada"}»? Esta acção não pode ser desfeita.`);
    if (!ok) return;
    try {
      await removerSeccaoPersonalizada(seccao.id);
      onAcao?.(`Removeu secção «${titulo || "personalizada"}»`);
      onRemovida?.();
    } catch (e) {
      console.error(e);
      alert("Não foi possível remover a secção.");
    }
  }

  const accent = activa ? corDe(cor).solid : COR_PASSIVA;
  const tituloVazio = !titulo.trim();
  const textoVazio = !texto.trim();
  const temBotaoParcial = (textoBotao.trim().length > 0) !== (urlBotao.trim().length > 0);

  const acao = (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); remover(); }}
      disabled={bloqueado}
      title="Remover secção"
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold h-8 px-2.5 rounded-md disabled:opacity-40 transition-colors"
      style={{ background: T.card, color: "#B42318", border: `1px solid ${T.lineStrong}` }}
    >
      <Trash2 size={13} /> Remover
    </button>
  );

  return (
    <Foldable
      foldOpen={foldOpen}
      setFoldOpen={setFoldOpen}
      secId={`personalizada-${seccao.id}`}
      icon={Sparkles}
      accent={accent}
      titulo={titulo.trim() || "Secção personalizada"}
      defaultOpen={false}
      contador={activa ? "activa" : "desligada"}
      acao={acao}
    >
      {!activa && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-2"
          style={{ background: T.warnSoft, border: `1px solid ${T.warnAccent}`, color: T.warn }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Secção desligada na Estrutura — não vai entrar no email nem na página. Liga-a na «Estrutura da edição» para publicar.</span>
        </div>
      )}

      {/* Título */}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs font-semibold" style={{ color: T.muted }}>Título</label>
        <Tick s={tituloAS.estado} err={tituloAS.err} vazio={tituloVazio} />
      </div>
      <input
        type="text"
        value={titulo}
        disabled={bloqueado}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ex.: Aviso importante da semana"
        className="w-full text-[15px] font-display font-semibold rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
        style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
      />

      {/* Texto */}
      <div className="flex items-center gap-2 mt-4 mb-2">
        <label className="text-xs font-semibold" style={{ color: T.muted }}>Texto</label>
        <Tick s={textoAS.estado} err={textoAS.err} vazio={textoVazio} />
      </div>
      <textarea
        value={texto}
        disabled={bloqueado}
        rows={4}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Explica em 2-3 linhas o que estás a comunicar…"
        className="w-full text-[15px] leading-relaxed rounded-lg px-3.5 py-3 resize-y disabled:opacity-50 focus:outline-none"
        style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
      />

      {(tituloVazio || textoVazio) && activa && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: T.warnSoft, color: T.warn, border: `1px solid ${T.warnAccent}` }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            {tituloVazio && textoVazio
              ? "Falta título e texto — preenche ou desliga a secção."
              : tituloVazio
                ? "Falta o título."
                : "Falta o texto."}
          </span>
        </div>
      )}

      {/* Cor */}
      <div className="mt-4 mb-2">
        <label className="text-xs font-semibold" style={{ color: T.muted }}>Cor</label>
      </div>
      <div className="flex flex-wrap gap-2">
        {CORES_ORDENADAS.map((k) => {
          const p = COR_PRESETS[k];
          const sel = cor === k;
          return (
            <button
              key={k}
              type="button"
              disabled={bloqueado}
              onClick={() => escolherCor(k)}
              title={`${p.nome} — ${p.descricao}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-semibold transition disabled:opacity-40"
              style={{
                background: sel ? p.pastel : T.card,
                border: `1px solid ${sel ? p.solid : T.lineStrong}`,
                color: sel ? p.ink : T.ink,
                boxShadow: sel ? `inset 0 0 0 1px ${p.solid}` : undefined,
              }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: p.solid }} />
              {p.nome}
            </button>
          );
        })}
      </div>

      {/* Botão (opcional) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold" style={{ color: T.muted }}>Texto do botão (opcional)</label>
            <Tick s={textoBotaoAS.estado} err={textoBotaoAS.err} />
          </div>
          <input
            type="text"
            value={textoBotao}
            disabled={bloqueado}
            onChange={(e) => setTextoBotao(e.target.value)}
            placeholder="Ex.: Saber mais"
            className="w-full text-[14px] rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
            style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold" style={{ color: T.muted }}>URL do botão</label>
            <Tick s={urlBotaoAS.estado} err={urlBotaoAS.err} />
          </div>
          <input
            type="url"
            value={urlBotao}
            disabled={bloqueado}
            onChange={(e) => setUrlBotao(e.target.value)}
            placeholder="https://…"
            className="w-full text-[14px] rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
            style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
          />
        </div>
      </div>
      {temBotaoParcial && (
        <div className="mt-2 text-[11px]" style={{ color: T.faint }}>
          Para mostrar o botão, preenche o texto <em>e</em> o URL. Deixa ambos vazios para não mostrar botão.
        </div>
      )}
    </Foldable>
  );
}
