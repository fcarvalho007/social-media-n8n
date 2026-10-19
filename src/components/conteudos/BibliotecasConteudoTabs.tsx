import { Link } from "react-router-dom";

interface BibliotecasConteudoTabsProps {
  ativa: "meus" | "cronica";
}

const ABAS = [
  { id: "meus" as const, nome: "Meus conteúdos", url: "/estudio/carrosseis" },
  { id: "cronica" as const, nome: "Divulgação da newsletter", url: "/estudio/redes-sociais" },
];

export function BibliotecasConteudoTabs({ ativa }: BibliotecasConteudoTabsProps) {
  return (
    <nav aria-label="Bibliotecas de conteúdos" className="hub-section-nav flex-wrap">
      {ABAS.map((aba) => <Link key={aba.id} to={aba.url} className="hub-section-link" aria-current={ativa === aba.id ? "page" : undefined}>{aba.nome}</Link>)}
    </nav>
  );
}
