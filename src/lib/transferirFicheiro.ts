// Robust file download for exported carousel files: fetch → validate status/MIME → blob → named download.
// No new tab (target=_blank is blocked in the preview frame / by some extensions); never bypasses blockers.
export type ResultadoTransferencia = { ok: true } | { ok: false; motivo: "rede" | "http" | "mime"; detalhe: string };

const MIME_ESPERADO: Record<string, string[]> = {
  pdf: ["application/pdf"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  png: ["image/png"],
  json: ["application/json", "text/plain"],
};

export function mimeAceite(nome: string, mime: string | null): boolean {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const esperado = MIME_ESPERADO[ext];
  if (!esperado) return true;
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  return esperado.includes(base);
}

export async function transferirFicheiro(
  url: string,
  nome: string,
  deps: { fetch?: typeof fetch; guardar?: (blob: Blob, nome: string) => void } = {},
): Promise<ResultadoTransferencia> {
  const f = deps.fetch ?? fetch;
  let r: Response;
  try {
    r = await f(url, { cache: "no-store" });
  } catch (e) {
    return { ok: false, motivo: "rede", detalhe: (e as Error).message || "Pedido bloqueado ou sem ligação." };
  }
  if (!r.ok) return { ok: false, motivo: "http", detalhe: `O servidor respondeu ${r.status}.` };
  const mime = r.headers.get("content-type");
  if (!mimeAceite(nome, mime)) return { ok: false, motivo: "mime", detalhe: `Tipo inesperado: ${mime ?? "desconhecido"}.` };
  const blob = await r.blob();
  (deps.guardar ?? guardarBlob)(blob, nome);
  return { ok: true };
}

function guardarBlob(blob: Blob, nome: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10_000);
}

/** Direct storage link that asks the server for an attachment (Supabase `?download=`), as a manual fallback. */
export function linkDescarga(url: string, nome: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("download", nome);
    return u.toString();
  } catch {
    return url;
  }
}
