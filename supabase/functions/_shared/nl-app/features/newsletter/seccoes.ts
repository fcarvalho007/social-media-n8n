import { Star, Newspaper, PenLine, Mic, LayoutGrid, BookOpen, Package, Sparkles, BarChart3, Wrench, MessageCircle, type LucideIcon } from "lucide-react";
import type { SeccaoTipo, SeccaoCor } from "./data.ts";
import {
  CORES_FERRAMENTA,
  PALETAS_FERRAMENTA,
  paletaFerramenta,
  type PaletaFerramenta,
} from "../../../newsletter-engine/revista/cores-ferramenta.ts";

export interface TipoMeta {
  rotulo: string;
  icone: LucideIcon;
  descricao: string;
}

export const TIPO_META: Record<Exclude<SeccaoTipo, "personalizada">, TipoMeta> = {
  destaques:          { rotulo: "Destaques da Semana",     icone: Star,          descricao: "Até 3 notícias no topo do email" },
  contadores:         { rotulo: "Contadores",              icone: BarChart3,     descricao: "Resumo com nº de notícias na newsletter e no site" },
  cronica:            { rotulo: "Crónica",                 icone: PenLine,       descricao: "Texto assinado + leituras recomendadas" },
  consultoria:        { rotulo: "Consultoria",             icone: MessageCircle, descricao: "CTA de baixa fricção a seguir à crónica" },
  podcast:            { rotulo: "Episódio do podcast",     icone: Mic,           descricao: "Cartão vermelho com o episódio semanal" },
  categorias:         { rotulo: "Notícias por categoria",  icone: LayoutGrid,    descricao: "Blocos de notícias agrupadas por categoria" },
  ferramentas_semana: { rotulo: "Ferramenta da semana",    icone: Wrench,        descricao: "Até 2 ferramentas destacadas da semana" },
  livro:              { rotulo: "Livro da Semana",         icone: BookOpen,      descricao: "Bloco fixo do livro/guia" },
  recursos:           { rotulo: "Recursos Premium",        icone: Package,       descricao: "Bloco fixo com CTA final" },
};

export const META_PERSONALIZADA: TipoMeta = {
  rotulo: "Secção personalizada",
  icone: Sparkles,
  descricao: "Bloco livre com título, texto e botão opcional",
};

export function metaDe(tipo: SeccaoTipo): TipoMeta {
  return tipo === "personalizada" ? META_PERSONALIZADA : TIPO_META[tipo];
}

export type CorPreset = PaletaFerramenta;

export const COR_PRESETS: Record<SeccaoCor, CorPreset> = PALETAS_FERRAMENTA;

export const CORES_ORDENADAS: SeccaoCor[] = CORES_FERRAMENTA;

export function corDe(chave: string | null | undefined): CorPreset {
  return paletaFerramenta(chave);
}
