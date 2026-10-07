export interface Caixa { id: string; x: number; y: number; w: number; h: number }
export interface Area { x: number; y: number; w: number; h: number }

export function normalizarArea(a: Area): Area {
  return { x: Math.min(a.x, a.x + a.w), y: Math.min(a.y, a.y + a.h), w: Math.abs(a.w), h: Math.abs(a.h) };
}

/** Selects every visible box touched by the marquee, including partial intersections. */
export function elementosTocados(area: Area, caixas: Caixa[]): string[] {
  const a = normalizarArea(area);
  if (a.w < 2 && a.h < 2) return [];
  return caixas.filter((c) => c.x < a.x + a.w && c.x + c.w > a.x && c.y < a.y + a.h && c.y + c.h > a.y).map((c) => c.id);
}