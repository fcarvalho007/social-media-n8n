import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Unlink, Smile } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { normalizarConteudoCronica, sanitizarHtmlCronica } from "./sanitizeHtml";

const EmojiPicker = lazy(() =>
  import("./revista/EmojiPicker").then((m) => ({ default: m.EmojiPicker })),
);

import type { AutoSaveEstado } from "./useAutoSave";

interface Props {
  html: string;
  disabled?: boolean;
  onChange: (html: string) => void;
  accent: string;
  line: string;
  ink: string;
  muted: string;
  card: string;
  shell: string;
  autoSaveEstado?: AutoSaveEstado;
  autoSaveErr?: string | null;
  /** Repetir a última gravação falhada. */
  onRepetir?: () => void;
  /** Marca a crónica como nunca preenchida, para mostrar «· por guardar»
      em vez de esconder o indicador. */
  vazio?: boolean;
  /**
   * O conteúdo guardado já chegou da base de dados. Enquanto for falso o
   * editor não emite `onChange`: o parágrafo vazio de arranque nunca é
   * confundido com uma edição humana.
   */
  pronto?: boolean;
  /**
   * Barra fixa ao topo durante o scroll e selector de emojis.
   * Activada apenas no editor Revista; o Clássico mantém a barra simples.
   */
  barraAvancada?: boolean;
}



/**
 * Editor mínimo (B, I, U, link) que devolve HTML sanitizado.
 * O conteúdo guardado em `cronicas.conteudo` passa a ser HTML.
 * Texto plano legado é convertido em <p> no arranque.
 */
export function CronicaEditor(props: Props) {
  const {
    html, disabled, onChange, accent, line, ink, muted, card, shell,
    autoSaveEstado, autoSaveErr, onRepetir, vazio, pronto = true, barraAvancada,
  } = props;
  /** Já foi aplicado o conteúdo remoto (mesmo que seja vazio). */
  const hydrated = useRef(false);
  /** Estamos a aplicar conteúdo por código, não é edição humana. */
  const aplicando = useRef(false);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
    ],
    content: normalizarConteudoCronica(html),
    editorProps: {
      attributes: {
        class: "ds-cronica-prose focus:outline-none",
      },
      transformPastedHTML: (html) => sanitizarHtmlCronica(html),
    },
    onUpdate: ({ editor: ed }) => {
      // Só alterações editoriais reais, depois da hidratação, sobem ao pai.
      if (!hydrated.current || aplicando.current) return;
      const bruto = ed.getHTML();
      const limpo = sanitizarHtmlCronica(bruto);
      onChange(limpo);
    },
  });

  // Hidratação: aplica o conteúdo guardado assim que o pai o declara pronto.
  useEffect(() => {
    if (!editor || hydrated.current || !pronto) return;
    const norm = normalizarConteudoCronica(html);
    aplicando.current = true;
    editor.commands.setContent(norm, { emitUpdate: false });
    aplicando.current = false;
    hydrated.current = true;
    // Texto plano legado convertido em HTML: grava a normalização.
    if (norm && norm !== (html ?? "")) onChange(norm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, html, pronto]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <div
      className={barraAvancada ? "rounded-lg" : "rounded-lg overflow-hidden"}
      style={{ border: `1px solid ${line}`, background: shell }}
    >
      <Toolbar editor={editor} disabled={!!disabled} accent={accent} line={line} muted={muted} card={card} autoSaveEstado={autoSaveEstado} autoSaveErr={autoSaveErr} onRepetir={onRepetir} vazio={vazio} barraAvancada={barraAvancada} />

      <EditorContent editor={editor} />
      <style>{`
        .ds-cronica-prose {
          padding: 12px 14px;
          font-size: 16px;
          line-height: 1.7;
          color: ${ink};
          min-height: 140px;
        }
        .ds-cronica-prose p { margin: 0 0 0.75em 0; }
        .ds-cronica-prose p:last-child { margin-bottom: 0; }
        .ds-cronica-prose a { color: ${accent}; text-decoration: underline; }
        .ds-cronica-prose strong { font-weight: 700; }
        .ds-cronica-prose em { font-style: italic; }
        .ds-cronica-prose u { text-decoration: underline; }
      `}</style>
    </div>
  );
}

function Toolbar({
  editor, disabled, accent, line, muted, card, autoSaveEstado, autoSaveErr, onRepetir, vazio, barraAvancada,
}: { editor: Editor; disabled: boolean; accent: string; line: string; muted: string; card: string; autoSaveEstado?: AutoSaveEstado; autoSaveErr?: string | null; onRepetir?: () => void; vazio?: boolean; barraAvancada?: boolean }) {


  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const abrirLink = () => {
    const actual = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(actual ?? "");
    setLinkOpen(true);
  };

  const aplicarLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  const removerLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <div
      className={`relative flex items-center gap-1 px-2 py-1.5 flex-wrap${
        // Desvio para não ficar por baixo do cabeçalho e da fita de fases.
        barraAvancada ? " sticky top-[76px] z-10 rounded-t-lg" : ""
      }`}
      style={{
        borderBottom: `1px solid ${line}`,
        background: card,
        ...(barraAvancada ? { boxShadow: "0 1px 0 rgba(16,24,40,0.04), 0 6px 12px -10px rgba(16,24,40,0.35)" } : null),
      }}
    >
      <TbBtn active={editor.isActive("bold")} accent={accent} muted={muted}
        onClick={() => editor.chain().focus().toggleBold().run()} disabled={disabled} title="Negrito (⌘B)">
        <Bold size={13} />
      </TbBtn>
      <TbBtn active={editor.isActive("italic")} accent={accent} muted={muted}
        onClick={() => editor.chain().focus().toggleItalic().run()} disabled={disabled} title="Itálico (⌘I)">
        <Italic size={13} />
      </TbBtn>
      <TbBtn active={editor.isActive("underline")} accent={accent} muted={muted}
        onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={disabled} title="Sublinhado (⌘U)">
        <UnderlineIcon size={13} />
      </TbBtn>
      <span style={{ width: 1, height: 16, background: line }} />
      <TbBtn active={editor.isActive("link")} accent={accent} muted={muted}
        onClick={abrirLink} disabled={disabled} title="Adicionar/editar link">
        <LinkIcon size={13} />
      </TbBtn>
      {editor.isActive("link") && (
        <TbBtn accent={accent} muted={muted} onClick={removerLink} disabled={disabled} title="Remover link">
          <Unlink size={13} />
        </TbBtn>
      )}
      {barraAvancada && (
        <>
          <span style={{ width: 1, height: 16, background: line }} />
          <TbBtn active={emojiOpen} accent={accent} muted={muted}
            onClick={() => { setLinkOpen(false); setEmojiOpen((v) => !v); }}
            disabled={disabled} title="Emojis">
            <Smile size={13} />
          </TbBtn>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <SaveIndicator estado={autoSaveEstado} err={autoSaveErr} muted={muted} vazio={vazio} onRepetir={onRepetir} />
        {!barraAvancada && (
          <span className="hidden sm:inline text-[11px]" style={{ color: muted }}>
            Negrito · Itálico · Sublinhado · Link
          </span>
        )}
      </div>

      {emojiOpen && (
        <Suspense fallback={null}>
          <EmojiPicker
            linha={line}
            esbatido={muted}
            destaque={accent}
            onEscolher={(emoji) => { editor.chain().focus().insertContent(emoji).run(); }}
            onFechar={() => setEmojiOpen(false)}
          />
        </Suspense>
      )}

      {linkOpen && (
        <div
          className="absolute left-2 top-full mt-1 z-10 flex items-center gap-1 rounded-lg p-1.5 shadow-lg"
          style={{ background: "#FFFFFF", border: `1px solid ${line}` }}
        >
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarLink(); } if (e.key === "Escape") setLinkOpen(false); }}
            placeholder="https://…"
            className="text-xs px-2 py-1 rounded-md w-64"
            style={{ border: `1px solid ${line}` }}
          />
          <button
            onClick={aplicarLink}
            className="text-xs font-bold px-2.5 py-1 rounded-md text-white"
            style={{ background: accent }}
          >
            Aplicar
          </button>
          <button
            onClick={() => setLinkOpen(false)}
            className="text-xs px-2 py-1 rounded-md"
            style={{ color: muted }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function TbBtn({
  children, onClick, active, disabled, title, accent, muted,
}: { children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string; accent: string; muted: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-11 w-11 sm:h-auto sm:w-auto inline-flex items-center justify-center p-1.5 rounded-md transition-colors disabled:opacity-40"
      style={{
        color: active ? "#FFFFFF" : muted,
        background: active ? accent : "transparent",
      }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.background = "#F2F4F7"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ estado, err, muted, vazio, onRepetir }: { estado?: AutoSaveEstado; err?: string | null; muted: string; vazio?: boolean; onRepetir?: () => void }) {
  if (estado === "a-guardar") return <span className="text-[11px] font-semibold" style={{ color: muted }}>A guardar…</span>;
  if (estado === "guardado") return <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>✓ Guardado</span>;
  if (estado === "erro") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[11px] font-semibold" style={{ color: "#DC2626" }} title={err ?? undefined}>Erro ao guardar</span>
        {onRepetir && (
          <button type="button" onClick={onRepetir}
            className="text-[11px] font-semibold underline" style={{ color: "#DC2626" }}>
            Tentar novamente
          </button>
        )}
      </span>
    );
  }
  if (vazio) return <span className="text-[11px] font-semibold" style={{ color: "#98A2B3" }}>· por guardar</span>;
  return null;
}



