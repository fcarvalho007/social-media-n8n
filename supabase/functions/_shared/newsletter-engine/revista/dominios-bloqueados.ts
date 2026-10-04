/** Parses the comma/newline separated list stored in `configuracoes`. */
export function lerListaDominios(valor: string | null | undefined): string[] {
  return (valor ?? "")
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

/** Returns blocked domains found in any URL inside the given content. */
export function encontrarDominiosBloqueados(conteudo: unknown, bloqueados: string[]): string[] {
  if (bloqueados.length === 0) return [];
  const texto = typeof conteudo === "string" ? conteudo : JSON.stringify(conteudo ?? "");
  const hosts = new Set<string>();
  for (const m of texto.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1]!.toLowerCase());
  const achados = new Set<string>();
  for (const h of hosts) {
    for (const d of bloqueados) if (h === d || h.endsWith(`.${d}`)) achados.add(d);
  }
  return [...achados];
}
