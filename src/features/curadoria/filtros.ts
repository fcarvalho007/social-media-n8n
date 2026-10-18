import type { DecisaoEditorial } from '@/services/curadoria';

export interface FiltrosCuradoria {
  estado: DecisaoEditorial;
  query: string;
  categoria: string;
  dias: string;
  pagina: number;
}
export const FILTROS_CURADORIA: FiltrosCuradoria = { estado: 'pendente', query: '', categoria: 'todas', dias: '7', pagina: 0 };
const TEMAS = ['todas', 'ia', 'google', 'youtube', 'meta', 'linkedin', 'tiktok', 'x', 'media'];
export function lerFiltrosCuradoria(params: URLSearchParams): FiltrosCuradoria {
  const estado = params.get('noticias_estado');
  const dias = params.get('noticias_periodo');
  const categoria = params.get('noticias_tema');
  const pagina = Number(params.get('noticias_pagina') ?? 1);
  return {
    estado: estado === 'aprovada' || estado === 'rejeitada' ? estado : 'pendente',
    query: (params.get('noticias_q') ?? '').slice(0, 200),
    categoria: categoria && TEMAS.includes(categoria) ? categoria : 'todas',
    dias: dias && ['3', '7', '30', 'todos'].includes(dias) ? dias : '7',
    pagina: Number.isSafeInteger(pagina) && pagina > 0 ? Math.min(pagina - 1, 9999) : 0,
  };
}
export function guardarFiltrosCuradoria(params: URLSearchParams, filtros: FiltrosCuradoria) {
  const seguintes = new URLSearchParams(params);
  const valores = { noticias_estado: filtros.estado === 'pendente' ? '' : filtros.estado, noticias_q: filtros.query, noticias_tema: filtros.categoria === 'todas' ? '' : filtros.categoria, noticias_periodo: filtros.dias === '7' ? '' : filtros.dias, noticias_pagina: filtros.pagina ? String(filtros.pagina + 1) : '' };
  for (const [chave, valor] of Object.entries(valores)) { if (valor) seguintes.set(chave, valor); else seguintes.delete(chave); }
  return seguintes;
}
