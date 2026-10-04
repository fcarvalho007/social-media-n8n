// Validação determinística pós-IA para descrições de notícias.
// Regra da auditoria: descrição entre 18 e 30 palavras, léxico pt-PT.
//
// Uso:
//   const v = validarDescricao(txt);
//   if (v.estado === "curta") → pedir 2ª geração à IA
//   if (v.estado === "longa" && v.aparada) → gravar v.aparada (sem 2ª chamada)
//   if (v.estado === "longa" && !v.aparada) → pedir 2ª geração
//   if (v.estado === "ok") → gravar v.texto

export const MIN_PALAVRAS = 18;
export const MAX_PALAVRAS = 30;

export interface ResultadoValidacao {
  estado: "ok" | "curta" | "longa" | "vazia";
  palavras: number;
  texto: string;
  aparada?: string; // definido quando conseguimos aparar mecanicamente
}

// Substituições de brasileirismos para europeismos.
// Aplicado depois da IA como safety-net do prompt.
const SUBS_LEXICO: Array<[RegExp, string]> = [
  [/\brecursos?\b/gi, "funcionalidades"],
  [/\bassinantes?\b/gi, "subscritores"],
  [/\bassinatura(s)?\b/gi, "subscrição$1"],
  [/\busu[aá]rios?\b/gi, "utilizadores"],
  [/\barquivos?\b/gi, "ficheiros"],
  [/\btelas?\b/gi, "ecrãs"],
  [/\bcelulares?\b/gi, "telemóveis"],
  [/\btimes?\b(?!\s+de\s+)/gi, "equipa"],
  [/\bplanilhas?\b/gi, "folhas de cálculo"],
];


export function normalizarLexico(texto: string): string {
  let t = texto;
  for (const [re, subs] of SUBS_LEXICO) {
    t = t.replace(re, (m: string) => {
      // preserva capitalização inicial
      if (m && m[0] === m[0].toUpperCase() && subs.length > 0) {
        return subs[0].toUpperCase() + subs.slice(1);
      }
      return subs;
    });
  }
  return t;
}


export function contarPalavras(texto: string): number {
  const t = (texto ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Apara mecanicamente por fronteira de frase até <= MAX_PALAVRAS. */
function apararPorFrase(texto: string): string | null {
  const trocos = texto.split(/(?<=[.!?])\s+/).filter(Boolean);
  const acc: string[] = [];
  for (const t of trocos) {
    const tentativa = [...acc, t].join(" ");
    if (contarPalavras(tentativa) <= MAX_PALAVRAS) acc.push(t);
    else break;
  }
  if (acc.length === 0) return null;
  const r = acc.join(" ").trim();
  if (contarPalavras(r) < MIN_PALAVRAS) return null;
  return r;
}

export function validarDescricao(texto: string | null | undefined): ResultadoValidacao {
  const t = normalizarLexico((texto ?? "").replace(/\s+/g, " ").trim());
  const n = contarPalavras(t);
  if (n === 0) return { estado: "vazia", palavras: 0, texto: "" };
  if (n < MIN_PALAVRAS) return { estado: "curta", palavras: n, texto: t };
  if (n <= MAX_PALAVRAS) return { estado: "ok", palavras: n, texto: t };
  const aparada = apararPorFrase(t);
  if (aparada) return { estado: "longa", palavras: n, texto: t, aparada };
  return { estado: "longa", palavras: n, texto: t };
}
