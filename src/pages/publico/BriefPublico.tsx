import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PaginaBrief, type BriefConteudo } from "@/newsletter/features/brief/PaginaBrief";
import { fmtDataPublica } from "@/newsletter/features/revista-web/ui";
import { obterBrief, type BriefPublicoApi } from "@/services/nlPublico";
import { EstadoPublico } from "./EdicoesArquivo";
import "@/newsletter/newsletter.css";

const AUTOR = "Frederico Carvalho";

/** Public Brief page: only briefs of sent editions are returned by the server. */
export default function BriefPublico() {
  const { slug = "" } = useParams();
  const [sp] = useSearchParams();
  const [brief, setBrief] = useState<BriefPublicoApi | null | undefined>(undefined);
  useEffect(() => {
    obterBrief(slug).then((b) => { setBrief(b); if (b) document.title = `${b.titulo} · Digital Sprint Brief`; }).catch(() => setBrief(null));
  }, [slug]);
  useEffect(() => {
    // Radar and non-indexable briefs stay out of search engines.
    if (!brief || brief.indexavel) return;
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, follow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, [brief]);
  if (brief === undefined) return <EstadoPublico texto="A carregar o Brief…" />;
  if (!brief) return <EstadoPublico titulo="Este Brief não está disponível." texto="A página pode ter mudado de endereço ou ainda não ter sido publicada." />;
  const conteudo: BriefConteudo = {
    variante: brief.tipo === "destaque" ? "brief" : "quick",
    categoria: brief.categoria,
    titulo: brief.titulo,
    data: fmtDataPublica(brief.dataISO),
    dataISO: brief.dataISO,
    tempo: brief.tempo,
    fonte: brief.fonte,
    fonteUrl: brief.fonteUrl,
    resumo: brief.resumo,
    implicacoes: brief.implicacoes,
    leitura: brief.leitura ? { texto: brief.leitura, autor: AUTOR } : undefined,
    relacionados: brief.relacionados.map((r) => ({ categoria: r.categoria, titulo: r.titulo, tempo: r.tempo, slug: r.slug })),
    edicaoNumero: brief.edicaoNumero ?? undefined,
    slug,
    origem: sp.get("o") === "email" ? "email" : "edicao",
    // Aggregated counters go through the staff-only gateway; disabled for anonymous visitors.
    contar: false,
  };
  return <PaginaBrief conteudo={conteudo} />;
}
