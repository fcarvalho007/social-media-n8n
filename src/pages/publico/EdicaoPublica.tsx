import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PaginaEdicao } from "@/newsletter/features/revista-web/PaginaEdicao";
import { obterEdicao } from "@/services/nlPublico";
import type { PaginaEdicaoPublica } from "@/newsletter/_tipos-servidor/newsletter-engine/revista/publicacao.server";
import { EstadoPublico } from "./EdicoesArquivo";
import "@/newsletter/newsletter.css";

/** Public page of a SENT edition; anything not sent answers "não disponível". */
export default function EdicaoPublica() {
  const { numero } = useParams();
  const [pagina, setPagina] = useState<PaginaEdicaoPublica | null | undefined>(undefined);
  useEffect(() => {
    const n = Number(numero);
    if (!Number.isInteger(n) || n <= 0) { setPagina(null); return; }
    obterEdicao(n).then((p) => {
      setPagina(p);
      if (p) document.title = `${p.estrutura.cronica.titulo || `Edição ${n}`} · Digital Sprint`;
    }).catch(() => setPagina(null));
  }, [numero]);
  if (pagina === undefined) return <EstadoPublico texto="A carregar a edição…" />;
  if (!pagina) return <EstadoPublico titulo="Esta edição não está disponível." texto="Pode ainda não ter sido publicada ou o endereço estar incorreto." />;
  return <PaginaEdicao pagina={pagina} briefs={pagina.briefs} />;
}
