// Página do Digital Sprint Brief — desenho aprovado na Fase 0A.
//
// Usada tanto pelas rotas QA (dados simulados) como pela rota pública
// `/brief/:slug` (dados reais). Não há dois desenhos: só um componente.

import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/newsletter/shim/router";

import { registarEventoBrief } from "./analytics";

import { ProgressoLeitura } from "@/newsletter/features/revista-web/Navegacao";
import { Etiqueta } from "@/newsletter/features/revista-web/ui";

export interface ImplicacaoBriefUI {
  titulo: string;
  texto: string;
}

export interface RelacionadoBriefUI {
  categoria: string;
  titulo: string;
  tempo: string;
  /** Slug do Brief relacionado. Ausente nos protótipos. */
  slug?: string;
}

export interface BriefConteudo {
  variante: "brief" | "quick";
  categoria: string;
  titulo: string;
  subtitulo?: string;
  data: string;
  dataISO: string;
  tempo: string;
  fonte: string;
  fonteUrl: string;
  resumo: string[];
  implicacoes: ImplicacaoBriefUI[];
  leitura?: {
    texto: string;
    citacao?: string;
    autor: string;
  };
  relacionados: RelacionadoBriefUI[];
  /** Número da edição de origem, para a navegação de regresso. */
  edicaoNumero?: number;
  /** Aviso da barra superior (só em QA). */
  aviso?: string;
  /** Nota do rodapé. */
  notaRodape?: string;
  /** Parâmetros a propagar nas ligações internas durante o QA. */
  qa?: boolean;
  /** Slug desta página, usado apenas nas contagens agregadas. */
  slug?: string;
  /** Origem da visita (`email` quando o endereço traz ?o=email). */
  origem?: "email" | "edicao" | null;
  /** Contar interações. Desligado nos protótipos QA. */
  contar?: boolean;
}

const URL_CONSULTORIA = "https://fredericocarvalho.pt/consultoria";

function VoltarAEdicao({ conteudo, className = "" }: { conteudo: BriefConteudo; className?: string }) {
  if (!conteudo.edicaoNumero) return null;
  return (
    <Link
      to="/edicoes/$numero"
      params={{ numero: String(conteudo.edicaoNumero) }}
      className={`rw-link inline-flex min-h-11 items-center text-[13px] font-semibold text-rw-blue ${className}`}
    >
      <span aria-hidden className="mr-2">←</span> Voltar à edição #{conteudo.edicaoNumero}
    </Link>
  );
}

function CabecalhoBrief({ conteudo }: { conteudo: BriefConteudo }) {
  const quick = conteudo.variante === "quick";
  return (
    <header className={`border-b border-rw-rule ${quick ? "pb-9 pt-9 sm:pb-12 sm:pt-12" : "pb-12 pt-10 sm:pb-16 sm:pt-14"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-rw-blue">
          Digital Sprint / {quick ? "Quick Brief" : "Brief"}
        </p>
        <VoltarAEdicao conteudo={conteudo} />
      </div>
      <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.18em] text-rw-ink-2">{conteudo.categoria}</p>
      <h1
        className={`mt-3 max-w-[52rem] font-display font-bold leading-[0.98] text-rw-ink ${
          quick ? "text-[40px] sm:text-[58px]" : "text-[44px] sm:text-[68px] lg:text-[76px]"
        }`}
      >
        {conteudo.titulo}
      </h1>
      {conteudo.subtitulo ? (
        <p className={`max-w-[45rem] font-serif leading-[1.45] text-rw-ink-2 ${quick ? "mt-5 text-[19px]" : "mt-7 text-[21px] sm:text-[24px]"}`}>
          {conteudo.subtitulo}
        </p>
      ) : null}
      <p className="mt-7 flex flex-wrap items-center gap-x-2 text-[12px] font-medium uppercase tracking-[0.12em] text-rw-ink-2">
        <time dateTime={conteudo.dataISO}>{conteudo.data}</time>
        <span aria-hidden>·</span>
        <span>{conteudo.tempo} de leitura</span>
      </p>
      {conteudo.fonteUrl ? (
        <p className="mt-5">
          <a
            className="rw-link inline-flex min-h-11 items-center gap-2 text-[13.5px] font-semibold text-rw-blue"
            href={conteudo.fonteUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => registarEventoBrief("brief_source_click", conteudo.slug, conteudo.edicaoNumero, conteudo.contar)}
          >
            Fonte original · {conteudo.fonte} <ArrowUpRight size={14} aria-hidden />
          </a>
        </p>
      ) : null}
    </header>
  );
}

function TituloBloco({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-t-[3px] border-rw-ink pt-4 font-display text-[18px] font-bold uppercase tracking-[0.08em] text-rw-ink sm:text-[20px]">
      {children}
    </h2>
  );
}

function Rail({ conteudo }: { conteudo: BriefConteudo }) {
  const items: Array<[string, string]> = [
    ...(conteudo.edicaoNumero ? ([["Edição", `#${conteudo.edicaoNumero}`]] as Array<[string, string]>) : []),
    ["Tema", conteudo.categoria],
    ["Leitura", conteudo.tempo],
  ];
  return (
    <aside aria-label="Dados editoriais" className="hidden border-t border-rw-chalk/30 pt-5 text-rw-chalk lg:block">
      <dl className="space-y-7">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rw-chalk-2">{label}</dt>
            <dd className="mt-1 text-[14px] leading-5">{value}</dd>
          </div>
        ))}
        {conteudo.fonteUrl ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rw-chalk-2">Fonte</dt>
            <dd className="mt-1">
              <a className="rw-link inline-flex items-center gap-1 text-[14px] text-rw-ciano" href={conteudo.fonteUrl} target="_blank" rel="noreferrer noopener" onClick={() => registarEventoBrief("brief_source_click", conteudo.slug, conteudo.edicaoNumero, conteudo.contar)}>
                {conteudo.fonte} <ArrowUpRight size={13} aria-hidden />
              </a>
            </dd>
          </div>
        ) : null}
        {conteudo.edicaoNumero ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rw-chalk-2">Regressar</dt>
            <dd className="mt-1">
              <Link
                to="/edicoes/$numero"
                params={{ numero: String(conteudo.edicaoNumero) }}
                className="rw-link text-[14px] text-rw-ciano"
              >
                Edição #{conteudo.edicaoNumero}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function EmTrintaSegundos({ paragrafos }: { paragrafos: string[] }) {
  return (
    <section aria-labelledby="resumo-titulo">
      <TituloBloco><span id="resumo-titulo">Em 30 segundos</span></TituloBloco>
      <div className="mt-7 space-y-5 text-[17px] leading-[1.75] text-rw-ink sm:text-[18px]">
        {paragrafos.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
      </div>
    </section>
  );
}

function PorqueInteressa({ implicacoes }: { implicacoes: ImplicacaoBriefUI[] }) {
  if (!implicacoes.length) return null;
  return (
    <section aria-labelledby="interessa-titulo">
      <TituloBloco><span id="interessa-titulo">Porque interessa</span></TituloBloco>
      <ol className="mt-6 border-b border-rw-rule">
        {implicacoes.map((item, index) => (
          <li key={`${item.titulo}-${index}`} className="grid gap-3 border-t border-rw-rule py-5 sm:grid-cols-[4rem_10rem_minmax(0,1fr)] sm:gap-5">
            <span className="font-display text-[14px] font-semibold text-rw-blue">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-display text-[18px] font-semibold text-rw-ink">{item.titulo}</h3>
            <p className="text-[15.5px] leading-7 text-rw-ink-2">{item.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MinhaLeitura({ leitura }: { leitura: NonNullable<BriefConteudo["leitura"]> }) {
  return (
    <section aria-labelledby="leitura-titulo" className="bg-rw-navy px-6 py-9 text-rw-chalk sm:px-10 sm:py-12">
      <h2 id="leitura-titulo" className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-rw-ciano">A minha leitura</h2>
      <p className="mt-6 max-w-[43rem] whitespace-pre-line font-serif text-[20px] leading-[1.7] text-rw-chalk sm:text-[23px]">{leitura.texto}</p>
      {leitura.citacao ? (
        <blockquote className="mt-9 border-l-2 border-rw-ciano pl-5 font-serif text-[27px] leading-[1.25] text-rw-chalk sm:pl-7 sm:text-[36px]">
          “{leitura.citacao}”
        </blockquote>
      ) : null}
      <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-rw-chalk-2">{leitura.autor}</p>
    </section>
  );
}

function FonteOriginal({ conteudo }: { conteudo: BriefConteudo }) {
  if (!conteudo.fonteUrl) return null;
  return (
    <section aria-labelledby="fonte-titulo">
      <TituloBloco><span id="fonte-titulo">Fonte</span></TituloBloco>
      <div className="mt-6 sm:flex sm:items-end sm:justify-between sm:gap-8">
        <div>
          <p className="text-[14px] text-rw-ink-2">Fonte original · <strong className="font-semibold text-rw-ink">{conteudo.fonte}</strong></p>
          <p className="mt-2 text-[13px] leading-6 text-rw-ink-2">Síntese e contexto editorial Digital Sprint.</p>
        </div>
        <a className="mt-5 inline-flex min-h-11 items-center gap-2 border-b-2 border-rw-blue font-semibold text-rw-blue sm:mt-0" href={conteudo.fonteUrl} target="_blank" rel="noreferrer noopener" onClick={() => registarEventoBrief("brief_source_click", conteudo.slug, conteudo.edicaoNumero, conteudo.contar)}>
          Ler a notícia original <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
    </section>
  );
}

function Relacionados({ itens, contar }: { itens: RelacionadoBriefUI[]; contar?: boolean }) {
  if (!itens.length) return null;
  return (
    <section aria-labelledby="relacionados-titulo">
      <TituloBloco><span id="relacionados-titulo">Continua a explorar</span></TituloBloco>
      <ul className="mt-5 border-b border-rw-rule">
        {itens.map((item) => (
          <li key={item.slug ?? item.titulo} className="group border-t border-rw-rule py-5 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)_4rem] sm:items-baseline sm:gap-5">
            <Etiqueta>{item.categoria}</Etiqueta>
            {item.slug ? (
              <Link
                to="/brief/$slug"
                params={{ slug: item.slug }}
                className="rw-link mt-2 inline text-[17px] font-semibold leading-7 text-rw-ink sm:mt-0"
                onClick={() => registarEventoBrief("brief_related_click", item.slug, null, contar)}
              >
                {item.titulo}
              </Link>
            ) : (
              <span className="mt-2 inline text-[17px] font-semibold leading-7 text-rw-ink sm:mt-0">{item.titulo}</span>
            )}
            <span className="mt-2 block text-[12px] text-rw-ink-2 sm:mt-0 sm:text-right">{item.tempo}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaComercial({ conteudo }: { conteudo: BriefConteudo }) {
  return (
    <aside className="border-y border-rw-rule py-8 sm:grid sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10 sm:py-10">
      <div>
        <p className="font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-rw-blue">Da tendência à aplicação.</p>
        <p className="mt-3 max-w-[38rem] font-serif text-[20px] leading-8 text-rw-ink">Formação executiva e consultoria para equipas que querem transformar IA em processos reais.</p>
      </div>
      <a
        href={URL_CONSULTORIA}
        target="_blank"
        rel="noreferrer noopener"
        className="rw-link mt-6 inline-flex min-h-11 items-center font-semibold text-rw-ink sm:mt-0"
        onClick={() => registarEventoBrief("brief_commercial_cta", conteudo.slug, conteudo.edicaoNumero, conteudo.contar)}
      >
        Ver como posso ajudar →
      </a>
    </aside>
  );
}

export function PaginaBrief({ conteudo }: { conteudo: BriefConteudo }) {
  const quick = conteudo.variante === "quick";
  const { slug, origem, edicaoNumero, contar } = conteudo;

  useEffect(() => {
    if (!contar || !origem) return;
    registarEventoBrief(
      origem === "email" ? "brief_open_from_email" : "edition_brief_click",
      slug,
      edicaoNumero,
      true,
    );
  }, [contar, origem, slug, edicaoNumero]);

  return (
    <div className="rw rw-sala min-h-dvh overflow-x-clip">
      <ProgressoLeitura />
      <div className="border-b border-rw-hairline bg-rw-void text-rw-chalk">
        <div className="mx-auto flex min-h-10 max-w-[86rem] items-center justify-between gap-4 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:px-8 lg:px-12">
          <span>Digital Sprint Brief</span>
          {conteudo.aviso ? <span className="text-rw-ciano">{conteudo.aviso}</span> : null}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[86rem] lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10 lg:px-12 lg:py-12 xl:grid-cols-[13rem_minmax(0,58rem)] xl:justify-center xl:gap-14">
        <div className="px-5 pt-8 sm:px-8 lg:px-0 lg:pt-12">
          <p className="font-display text-[22px] font-bold leading-none text-rw-chalk">DIGITAL <span className="text-rw-ciano">SPRINT.</span></p>
          <div className="mt-9"><Rail conteudo={conteudo} /></div>
        </div>

        <article className="rw-papel rw-assenta mt-7 min-w-0 px-5 sm:mt-9 sm:px-10 lg:mt-0 lg:px-14 xl:px-20">
          <CabecalhoBrief conteudo={conteudo} />

          <div className={`grid gap-12 py-12 sm:gap-16 sm:py-16 ${quick ? "" : "lg:py-20"}`}>
            <EmTrintaSegundos paragrafos={conteudo.resumo} />
            <PorqueInteressa implicacoes={conteudo.implicacoes} />
            {conteudo.leitura ? <MinhaLeitura leitura={conteudo.leitura} /> : null}
            <FonteOriginal conteudo={conteudo} />
            <Relacionados itens={conteudo.relacionados} contar={conteudo.contar} />
            {!quick ? <CtaComercial conteudo={conteudo} /> : null}
          </div>

          <footer className="border-t border-rw-ink py-8 text-[12px] text-rw-ink-2 sm:flex sm:items-center sm:justify-between">
            <VoltarAEdicao conteudo={conteudo} />
            <span className="mt-2 block sm:mt-0">{conteudo.notaRodape ?? "Digital Sprint · Brief editorial"}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
