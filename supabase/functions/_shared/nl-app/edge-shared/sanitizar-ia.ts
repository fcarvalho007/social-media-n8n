// Espelho Deno de `src/lib/sanitizar-ia.ts`. Actualiza os dois em
// conjunto. Ver documentação nesse ficheiro.

const RE_PREFIXO = /^\s*[«"'"']*\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{1,18}(?:\s+[a-záàâãéêíóôõúç]{1,18}){0,1}\s*:\s+/;
const RE_ASPAS = /^[«"'"'\s]+|[»"'"'\s]+$/g;

export function sanitizarSaidaIA(texto: string | null | undefined): string {
  if (!texto) return "";
  let t = String(texto).replace(/\s+/g, " ").trim();
  t = t.replace(RE_PREFIXO, "");
  const nu = t.replace(RE_ASPAS, "");
  if (nu && !nu.includes('"') && !nu.includes("«")) t = nu;
  return t.trim();
}
