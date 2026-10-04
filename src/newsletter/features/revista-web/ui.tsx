// Peças partilhadas da edição web Revista.
// Direcção artística «jornal digital»: papel claro, azul de marca, tipografia
// editorial. O arquivo (/edicoes) mantém a direcção escura anterior.

export const SERIF = "Georgia,'Times New Roman',serif";


export function fmtDataPublica(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

/** Data curta para linhas de metadados: «27 AGO». */
export function fmtDataCurta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

export function anoDe(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

/** Domínio legível de um URL, para creditar a fonte sem mostrar o link cru. */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function paragrafos(texto: string): string[] {
  return (texto || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function Etiqueta({
  children,
  className = "",
  sobre = "papel",
}: {
  children: React.ReactNode;
  className?: string;
  sobre?: "papel" | "navy" | "azul";
}) {
  const cor =
    sobre === "navy" ? "text-rw-chalk-2" : sobre === "azul" ? "text-white" : "text-rw-ink-2";
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${cor} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Envolve uma secção editorial. Já não esconde conteúdo: a revelação por
 * scroll repetia-se em todas as secções, atrasava a leitura e deixava blocos
 * invisíveis sem JavaScript. Mantém-se como wrapper semântico.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
  ...resto
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "nav" | "footer";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={className} {...resto}>
      {children}
    </Tag>
  );
}

/** Cabeçalho de secção — o filete grosso marca a mudança de nível editorial. */
export function TituloSeccao({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-28 border-t border-rw-rule pt-4 font-semibold tracking-tight text-rw-ink text-[20px] leading-tight sm:pt-5 sm:text-[26px]"
    >
      <span className="mr-3 inline-block h-2 w-2 translate-y-[-3px] bg-rw-blue" aria-hidden />
      {children}
    </h2>
  );
}

/**
 * Abertura de secção do jornal: «02 / A seleção completa» + título grande e
 * nota à direita. É a peça que marca o ritmo entre camadas editoriais.
 */
export function IntroSeccao({
  id,
  numero,
  etiqueta,
  titulo,
  nota,
}: {
  id: string;
  numero: number;
  etiqueta: string;
  titulo: string;
  nota?: string;
}) {
  const n = String(numero).padStart(2, "0");
  return (
    <div className="mt-14 mb-5 scroll-mt-28 sm:mt-20 sm:mb-7 sm:flex sm:items-end sm:justify-between sm:gap-10">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rw-blue">
          {n} / {etiqueta}
        </p>
        <h2
          id={id}
          className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-rw-ink sm:text-[44px]"
        >
          {titulo}
        </h2>
      </div>
      {nota ? (
        <p className="mt-3 max-w-[22rem] text-[14px] leading-6 text-rw-ink-2 sm:mt-0 sm:text-right">{nota}</p>
      ) : null}
    </div>
  );
}

