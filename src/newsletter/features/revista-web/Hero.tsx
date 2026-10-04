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
      <div className="flex flex-col items-start gap-4 border-b border-rw-ink pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-7 sm:pt-9">
        <p
          aria-label="Digital Sprint"
          className="font-display font-bold leading-[0.9] tracking-[-0.045em] text-[clamp(38px,7vw,84px)]"
        >
          DIGITAL <span className="text-rw-blue">SPRINT.</span>
        </p>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 text-right sm:w-auto sm:justify-end sm:gap-4">
          <div className="text-left sm:text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-rw-ink-2 sm:text-[12px]">
              Edição
            </span>
            {data ? (
              <time dateTime={dataISO ?? undefined} className="block whitespace-nowrap text-[11px] text-rw-ink-2 sm:text-[13px]">
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


      <div className="flex items-center justify-between gap-4 py-4 text-[13px] text-rw-ink-2 sm:py-5 sm:text-[14px]">
        <p className="min-w-0">
          <strong className="mr-2 block font-semibold text-rw-ink sm:inline">Frederico Carvalho</strong>
          <span>Consultor, autor e docente</span>
        </p>
        <p className="max-w-[8rem] shrink-0 text-right text-rw-blue sm:max-w-none">A minha seleção da semana.</p>
      </div>
    </header>
  );
}
