// Sanitizador determinístico aplicado a QUALQUER saída de IA destinada
// ao utilizador final. Protecção geral, não pontual — remove prefixos
// rotulares no início ("Assunto:", "Crónica:", "Título:", "Dado:", etc.)
// que a IA por vezes inclui apesar de instruções contrárias no prompt.
//
// Regras:
// - Remove no máximo UM prefixo (palavra ou duas palavras curtas
//   iniciadas por maiúscula, seguidas de dois pontos).
// - Colapsa espaços múltiplos e trima aspas encapsulantes.
// - Nunca altera o corpo depois do prefixo.
//
// Espelho em `supabase/functions/_shared/sanitizar-ia.ts` — actualiza
// os dois em conjunto.

const RE_PREFIXO = /^\s*[«"'"']*\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{1,18}(?:\s+[a-záàâãéêíóôõúç]{1,18}){0,1}\s*:\s+/;
const RE_ASPAS = /^[«"'"'\s]+|[»"'"'\s]+$/g;

export function sanitizarSaidaIA(texto: string | null | undefined): string {
  if (!texto) return "";
  let t = String(texto).replace(/\s+/g, " ").trim();
  // remove um único prefixo rotular no início
  t = t.replace(RE_PREFIXO, "");
  // remove aspas encapsulantes se toda a string estiver entre aspas
  const nu = t.replace(RE_ASPAS, "");
  if (nu && !nu.includes('"') && !nu.includes("«")) t = nu;
  return t.trim();
}
