// Cabeçalho editorial da edição pública: wordmark, bloco de edição e assinatura.
// É o gesto de identidade da página — nada de halos nem paralaxe.

interface Props {
  numero: number;
  /** Data por extenso: «11 setembro 2026». */
  data: string;
  /** Data ISO para o atributo `datetime`. */
  dataISO: string | null;
}

export function Cabecalho({ numero, data, dataISO }: Props) {
  return (
    <header className="mx-auto w-full max-w-[79rem] px-5 sm:px-8 lg:px-12">
      <div className="flex items-end justify-between gap-5 border-b border-rw-ink pb-5 pt-7 sm:gap-8 sm:pb-6 sm:pt-8">
        <p
          aria-label="Digital Sprint"
          className="min-w-0 font-display text-[36px] font-black leading-[0.78] tracking-[-0.045em] sm:text-[clamp(48px,7vw,82px)]"
        >
          <span className="block whitespace-nowrap">DIGITAL</span>
          <span className="mt-[0.18em] block whitespace-nowrap text-rw-blue">
            SPRINT<span className="text-rw-ink">.</span>
          </span>
        </p>
        <div className="flex shrink-0 items-end gap-2.5 text-right sm:gap-4">
          <div className="pb-0.5 text-right sm:pb-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-rw-ink-2 sm:text-[12px]">
              Edição
            </span>
            {data ? (
              <time dateTime={dataISO ?? undefined} className="mt-1 block max-w-[7.5rem] text-[11px] leading-4 text-rw-ink-2 sm:max-w-none sm:whitespace-nowrap sm:text-[13px]">
                {data}
              </time>
            ) : null}
          </div>
          <span
            className="block text-[42px] italic leading-none text-rw-ink sm:text-[64px]"
            style={{ fontFamily: "Georgia,'Times New Roman',serif" }}
          >
            {numero}
          </span>
        </div>
      </div>


      <div className="flex items-center justify-between gap-4 py-3.5 text-[13px] text-rw-ink-2 sm:py-4 sm:text-[14px]">
        <p className="min-w-0">
          <strong className="mr-2 block font-semibold text-rw-ink sm:inline">Frederico Carvalho</strong>
          <span>Consultor, autor e docente</span>
        </p>
        <p className="max-w-[8rem] shrink-0 text-right text-rw-blue sm:max-w-none">A minha seleção da semana.</p>
      </div>
    </header>
  );
}
