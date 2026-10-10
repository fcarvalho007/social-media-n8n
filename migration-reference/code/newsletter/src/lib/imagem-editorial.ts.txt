const ROTA_IMAGEM_ATUAL = "/functions/v1/nl-imagem/";
const ROTA_IMAGEM_ANTIGA = "/api/public/imagem/";

function baseBackend(valor: string): string {
  return valor.trim().replace(/\/+$/, "");
}

/** URL pública estável para uma imagem guardada no armazenamento editorial. */
export function urlImagemEditorial(backendUrl: string, caminho: string): string {
  return `${baseBackend(backendUrl)}${ROTA_IMAGEM_ATUAL}${caminho.replace(/^\/+/, "")}`;
}

/**
 * Converte URLs da antiga aplicação para o endpoint editorial atual.
 * URLs externas e URLs já atuais permanecem inalteradas.
 */
export function normalizarUrlImagemEditorial(url: string, backendUrl: string): string {
  try {
    const antiga = new URL(url);
    const inicio = antiga.pathname.indexOf(ROTA_IMAGEM_ANTIGA);
    if (inicio < 0) return url;
    const caminho = antiga.pathname.slice(inicio + ROTA_IMAGEM_ANTIGA.length);
    return caminho ? urlImagemEditorial(backendUrl, caminho) : url;
  } catch {
    return url;
  }
}