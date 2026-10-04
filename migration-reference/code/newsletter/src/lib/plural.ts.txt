// Pluralização em português — para nunca escrever «coisa(s)» na interface.

/** `plural(1, "coisa", "coisas")` → «1 coisa»; `plural(5, …)` → «5 coisas». */
export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/** Só a palavra, sem o número. */
export function palavra(n: number, singular: string, plural_: string): string {
  return n === 1 ? singular : plural_;
}

/** «Falta 1 destaque» / «Faltam 3 destaques». */
export function faltam(n: number, singular: string, plural_: string): string {
  return `${n === 1 ? "Falta" : "Faltam"} ${plural(n, singular, plural_)}`;
}
