import { useEffect, useState } from "react";
import { Link } from "@/newsletter/shim/router";
import { anoDe, fmtDataCurta } from "@/newsletter/features/revista-web/ui";
import { listarEdicoes } from "@/services/nlPublico";
import type { ResumoEdicaoPublica } from "@/newsletter/_tipos-servidor/newsletter-engine/revista/publicacao.server";
import "@/newsletter/newsletter.css";

const TITLE = "Arquivo de edições · Digital Sprint";

export default function EdicoesArquivo() {
  const [edicoes, setEdicoes] = useState<ResumoEdicaoPublica[] | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    document.title = TITLE;
    listarEdicoes().then(setEdicoes).catch(() => setErro(true));
  }, []);
  if (erro) return <EstadoPublico texto="Não foi possível carregar o arquivo. Tenta outra vez dentro de instantes." />;
  if (!edicoes) return <EstadoPublico texto="A carregar o arquivo…" />;

  // Agrupar por ano: o arquivo lê-se por varrimento, não por leitura linear.
  const anos: Array<{ ano: string; itens: typeof edicoes }> = [];
  for (const ed of edicoes) {
    const ano = anoDe(ed.data) || "—";
    const ultimo = anos[anos.length - 1];
    if (ultimo && ultimo.ano === ano) ultimo.itens.push(ed);
    else anos.push({ ano, itens: [ed] });
  }

  return (
    <div className="rw rw-sala rw-grao min-h-dvh">
      <div className="mx-auto w-full max-w-[48rem] px-5 py-10 sm:px-8 sm:py-16">
        <header className="border-b border-rw-hairline pb-4">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.28em] text-rw-chalk">Digital Sprint</p>
        </header>

        <h1 className="rw-entra mt-12 text-balance font-display font-semibold tracking-tight text-rw-chalk text-[34px] leading-[1.1] sm:text-[56px]">
          Arquivo de edições
        </h1>
        <p className="rw-entra mt-5 max-w-[38rem] text-[17px] leading-[1.7] text-rw-chalk-2">
          Curadoria semanal de marketing, media e tecnologia. Cada edição reúne a crónica, as três coisas que não
          ignorarias, o radar e todas as atualidades da semana.
        </p>

        {edicoes.length === 0 ? (
          <p className="mt-12 border-t border-rw-hairline pt-6 text-[16px] text-rw-chalk-2">
            Ainda não há edições publicadas.
          </p>
        ) : (
          anos.map((grupo) => (
            <section key={grupo.ano} className="mt-12" aria-labelledby={`ano-${grupo.ano}`}>
              <h2
                id={`ano-${grupo.ano}`}
                className="border-b border-rw-hairline pb-1 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-rw-ciano"
              >
                {grupo.ano}
              </h2>
              <ul>
                {grupo.itens.map((ed) => (
                  <li key={ed.numero} className="border-b border-rw-hairline">
                    <Link
                      to="/edicoes/$numero"
                      params={{ numero: String(ed.numero) }}
                      className="group grid grid-cols-[minmax(0,1fr)] gap-1 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6"
                    >
                      <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-rw-chalk-2 sm:pt-1.5">
                        #{ed.numero}
                        {ed.data ? ` · ${fmtDataCurta(ed.data)}` : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[19px] font-semibold leading-7 tracking-tight text-rw-chalk underline-offset-4 group-hover:text-rw-ciano sm:text-[22px] sm:leading-8">
                          {ed.titulo}
                        </span>
                        {ed.lede ? (
                          <span className="mt-1 block text-[15.5px] leading-7 text-rw-chalk-2">{ed.lede}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export function EstadoPublico({ titulo, texto }: { titulo?: string; texto: string }) {
  return (
    <div className="rw rw-sala flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        {titulo ? <h1 className="font-display text-[32px] font-bold text-rw-chalk sm:text-[44px]">{titulo}</h1> : null}
        <p className="mt-4 text-[15px] leading-7 text-rw-chalk-2">{texto}</p>
        {titulo ? <p className="mt-8"><a href="/edicoes" className="rw-link text-[15px] font-semibold text-rw-ciano">Ver as edições publicadas →</a></p> : null}
      </div>
    </div>
  );
}
