// Normalises WordPress credentials read from server secrets. Never logs or returns raw values.

/** WordPress application passwords: six groups of four alphanumerics, spaces optional. */
const PADRAO_APP_PASSWORD = /^[A-Za-z0-9]{4}( ?[A-Za-z0-9]{4}){5}$/;

export function limparValor(v: string | null | undefined): string {
  let s = (v ?? "").trim();
  if (s.length >= 2 && /^["'`]/.test(s) && s[s.length - 1] === s[0]) s = s.slice(1, -1).trim();
  return s;
}

export function pareceAppPassword(v: string): boolean {
  return PADRAO_APP_PASSWORD.test(v);
}

/** Cleans both values and swaps them when they were clearly saved in the wrong fields. */
export function normalizarCredenciaisWp(
  utilizador: string | null | undefined,
  password: string | null | undefined,
): { utilizador: string; password: string; trocadas: boolean } {
  const u = limparValor(utilizador);
  const p = limparValor(password);
  if (u && p && pareceAppPassword(u) && !pareceAppPassword(p)) {
    return { utilizador: p, password: u, trocadas: true };
  }
  return { utilizador: u, password: p, trocadas: false };
}

/** Strips HTML from a WordPress error message and adds a pt-PT hint for unknown users. */
export function mensagemErroWp(status: number, bruto: string | null | undefined): string {
  const texto = (bruto ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "sem detalhe";
  if (status === 401 || /utilizador desconhecido|unknown username|invalid_username/i.test(texto)) {
    return `O site recusou o acesso [${status}]: ${texto} Confirma nos segredos que «wordpress_site_username» é o nome de login (ou o email) da conta WordPress e que «wordpress_site_key» é uma palavra-passe de aplicação dessa mesma conta.`;
  }
  return `O site recusou o acesso [${status}]: ${texto}`;
}
