import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BibliotecasConteudoTabsProps {
  ativa: "meus" | "cronica";
}

const ABAS = [
  { id: "meus" as const, nome: "Meus conteúdos", url: "/estudio/carrosseis" },
  { id: "cronica" as const, nome: "Carrosséis da crónica", url: "/estudio/redes-sociais" },
];

export function BibliotecasConteudoTabs({ ativa }: BibliotecasConteudoTabsProps) {
  return (
    <nav aria-label="Bibliotecas de conteúdos" className="flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1 sm:w-fit">
      {ABAS.map((aba) => (
        <Button
          key={aba.id}
          asChild
          size="sm"
          variant={ativa === aba.id ? "default" : "ghost"}
          className="min-h-10 flex-1 whitespace-nowrap sm:flex-none"
        >
          <Link to={aba.url} aria-current={ativa === aba.id ? "page" : undefined}>{aba.nome}</Link>
        </Button>
      ))}
    </nav>
  );
}