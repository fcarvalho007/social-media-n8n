// Recorte de texto para resumos de interface: nunca corta a meio de palavra.

export function recortar(texto: string, max = 60): string {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max * 0.5 ? corte.slice(0, espaco) : corte).replace(/[.,;:–-]$/, "")}…`;
}
