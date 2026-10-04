import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import type { SeccaoRow, SeccaoCor, CamposSeccaoPersonalizada } from "./data";
import { COR_PRESETS, CORES_ORDENADAS } from "./seccoes";

export function SeccaoModal({
  modo,
  inicial,
  aGuardar,
  onFechar,
  onGuardar,
}: {
  modo: "criar" | "editar";
  inicial: SeccaoRow | null;
  aGuardar: boolean;
  onFechar: () => void;
  onGuardar: (campos: CamposSeccaoPersonalizada) => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [cor, setCor] = useState<SeccaoCor>((inicial?.cor as SeccaoCor) ?? "indigo");
  const [textoBotao, setTextoBotao] = useState(inicial?.texto_botao ?? "");
  const [urlBotao, setUrlBotao] = useState(inicial?.url_botao ?? "");

  const preset = COR_PRESETS[cor];
  const podeGuardar = titulo.trim().length > 0 && texto.trim().length > 0 && !aGuardar;

  const inputBase =
    "mt-1 w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-0 transition";
  const inputStyle = { border: "1px solid #D0D5DD", background: "#FFFFFF", color: "#101828" } as const;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(15,23,42,0.55)" }}>
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ background: "#FFFFFF", border: "1px solid #E4E7EC" }}>
        {/* Barra de accent (muda com a cor) */}
        <div style={{ height: 4, background: preset.solid }} />

        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #E4E7EC" }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ background: preset.solid }}>
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-[15px] leading-tight">
              {modo === "criar" ? "Adicionar secção personalizada" : "Editar secção personalizada"}
            </p>
            <p className="text-[11px]" style={{ color: "#667085" }}>Formulário à esquerda, pré-visualização à direita — actualiza em tempo real.</p>
          </div>
          <button onClick={onFechar} className="ml-auto p-1.5 rounded-md hover:bg-slate-100" style={{ color: "#667085" }} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        {/* Corpo: 2 colunas em desktop */}
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden flex-1">
          {/* Formulário */}
          <div className="px-5 py-4 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold" style={{ color: "#475467" }}>Título</label>
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Inscrições abertas — Curso Digital Sprint"
                className={inputBase + " font-semibold"}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-xs font-semibold" style={{ color: "#475467" }}>Texto</label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={5}
                placeholder="Explica em 2-3 linhas o que estás a comunicar."
                className={inputBase + " resize-y leading-relaxed"}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold" style={{ color: "#475467" }}>Texto do botão</label>
                <input
                  value={textoBotao}
                  onChange={(e) => setTextoBotao(e.target.value)}
                  placeholder="Opcional · Inscreve-te"
                  className={inputBase}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: "#475467" }}>URL do botão</label>
                <input
                  value={urlBotao}
                  onChange={(e) => setUrlBotao(e.target.value)}
                  placeholder="https://..."
                  className={inputBase}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold" style={{ color: "#475467" }}>Cor da secção</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {CORES_ORDENADAS.map((k) => {
                  const p = COR_PRESETS[k];
                  const sel = cor === k;
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setCor(k)}
                      title={p.descricao}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all"
                      style={{
                        background: sel ? p.solid : p.pastel,
                        border: `1.5px solid ${sel ? p.solid : p.borda}`,
                        color: sel ? "#FFFFFF" : p.ink,
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: sel ? "#FFFFFF" : p.solid }} />
                      <span className="text-xs font-bold">{p.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div className="border-t md:border-t-0 md:border-l overflow-y-auto" style={{ borderColor: "#E4E7EC", background: "#F3F4F6" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#FFFFFF", borderBottom: "1px solid #E4E7EC" }}>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#98A2B3" }}>Pré-visualização</span>
              <span className="ml-auto text-[10px]" style={{ color: "#98A2B3" }}>como aparece no email</span>
            </div>
            <div className="p-4">
              <div className="rounded-lg mx-auto max-w-[520px]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(16,24,40,0.08)", border: "1px solid #E4E7EC" }}>
                <PreviewSeccaoPersonalizada
                  titulo={titulo}
                  texto={texto}
                  cor={cor}
                  textoBotao={textoBotao}
                  urlBotao={urlBotao}
                />
              </div>
              <p className="text-[10px] mt-3 text-center" style={{ color: "#98A2B3" }}>
                Placeholders em cinzento indicam campos ainda por preencher.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: "1px solid #E4E7EC", background: "#F9FAFB" }}>
          <button onClick={onFechar} className="text-sm font-semibold px-3 py-2 rounded-md hover:bg-slate-100" style={{ color: "#475467" }}>
            Cancelar
          </button>
          <button
            onClick={() =>
              onGuardar({
                titulo: titulo.trim(),
                texto: texto.trim(),
                cor,
                texto_botao: textoBotao.trim() || null,
                url_botao: urlBotao.trim() || null,
              })
            }
            disabled={!podeGuardar}
            className="text-sm font-bold px-4 py-2 rounded-md text-white disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
            style={{ background: preset.solid }}
          >
            {aGuardar && <Loader2 size={13} className="animate-spin" />}
            {modo === "criar" ? "Adicionar secção" : "Guardar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewSeccaoPersonalizada({
  titulo,
  texto,
  cor,
  textoBotao,
  urlBotao,
}: {
  titulo: string;
  texto: string;
  cor: SeccaoCor;
  textoBotao: string;
  urlBotao: string;
}) {
  const c = COR_PRESETS[cor];
  const tituloVazio = !titulo.trim();
  const textoVazio = !texto.trim();
  const temBotao = textoBotao.trim() && urlBotao.trim();
  return (
    <div className="rounded-lg px-5 py-5 m-3" style={{ background: c.pastel, border: `1px solid ${c.borda}`, color: c.ink }}>
      <p
        className="font-display font-bold text-[17px] mb-2 leading-snug"
        style={tituloVazio ? { color: "#98A2B3", fontStyle: "italic", fontWeight: 500 } : undefined}
      >
        {tituloVazio ? "O teu título aparece aqui…" : titulo}
      </p>
      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={textoVazio ? { color: "#98A2B3", fontStyle: "italic" } : undefined}
      >
        {textoVazio ? "O texto da secção aparece aqui. Podes explicar em 2-3 linhas o que estás a comunicar." : texto}
      </p>
      {temBotao ? (
        <div className="mt-3">
          <span className="inline-block text-white text-xs font-bold px-4 py-2 rounded-md shadow-sm" style={{ background: c.solid }}>
            {textoBotao}
          </span>
        </div>
      ) : (
        (textoBotao.trim() || urlBotao.trim()) && (
          <p className="text-[11px] mt-3 opacity-70">Preenche texto e URL do botão para o ver aqui.</p>
        )
      )}
    </div>
  );
}
