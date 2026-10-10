import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline as UnderlineIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { normalizarConteudoCronica, sanitizarHtmlCronica } from "./sanitizeHtml";

interface Props {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
  linhas?: 1 | 2 | 3;
}

/** Editor editorial compacto: apenas B, I e U; nunca transporta estilos colados. */
export function TextoRicoCompacto({ etiqueta, valor, onChange, disabled, linhas = 1 }: Props) {
  const hidratado = useRef(false);
  const aplicando = useRef(false);
  const editor = useEditor({
    editable: !disabled,
    extensions: [StarterKit.configure({
      heading: false, bulletList: false, orderedList: false, blockquote: false,
      codeBlock: false, code: false, horizontalRule: false, strike: false, link: false,
    })],
    content: normalizarConteudoCronica(valor),
    editorProps: {
      attributes: { class: `ds-texto-rico-compacto linhas-${linhas} focus:outline-none` },
      transformPastedHTML: (html) => sanitizarHtmlCronica(html).replace(/<a\b[^>]*>|<\/a>/gi, ""),
    },
    onUpdate: ({ editor: actual }) => {
      if (!hidratado.current || aplicando.current) return;
      onChange(sanitizarHtmlCronica(actual.getHTML()).replace(/<a\b[^>]*>|<\/a>/gi, ""));
    },
  });

  useEffect(() => {
    if (!editor || hidratado.current) return;
    const normalizado = normalizarConteudoCronica(valor).replace(/<a\b[^>]*>|<\/a>/gi, "");
    aplicando.current = true;
    editor.commands.setContent(normalizado, { emitUpdate: false });
    aplicando.current = false;
    hidratado.current = true;
    if (normalizado && normalizado !== valor) onChange(normalizado);
  }, [editor, onChange, valor]);

  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  if (!editor) return null;

  const botao = "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted disabled:opacity-40";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{etiqueta}</span>
      <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:border-primary">
        <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1">
          <button type="button" className={botao} disabled={disabled} aria-label="Negrito" title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
          <button type="button" className={botao} disabled={disabled} aria-label="Itálico" title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
          <button type="button" className={botao} disabled={disabled} aria-label="Sublinhado" title="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ds-texto-rico-compacto { padding: 10px 14px; min-height: 44px; font-size: 15px; line-height: 1.55; color: hsl(var(--foreground)); }
        .ds-texto-rico-compacto.linhas-2 { min-height: 68px; }
        .ds-texto-rico-compacto.linhas-3 { min-height: 92px; }
        .ds-texto-rico-compacto p { margin: 0 0 .45em; }
        .ds-texto-rico-compacto p:last-child { margin-bottom: 0; }
        .ds-texto-rico-compacto strong { font-weight: 700; }
        .ds-texto-rico-compacto em { font-style: italic; }
        .ds-texto-rico-compacto u { text-decoration: underline; }
      `}</style>
    </label>
  );
}