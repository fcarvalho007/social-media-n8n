// Pexels network calls (server only; the key never leaves the server). One request per user click, never retried.
import { mapearFotos, urlDescarga, urlPexelsValido, type FotoPexelsMotor } from "./pexels.ts";
import { LIMITES_IMAGEM } from "./fontes.ts";

export type ResPesquisa = { ok: true; fotos: FotoPexelsMotor[]; mais: boolean } | { ok: false; erro: string; estado: number };

export async function pesquisarPexelsMotor(termo: string, pagina: number): Promise<ResPesquisa> {
  const chave = Deno.env.get("PEXELS_API_KEY");
  if (!chave) return { ok: false, erro: "A ligação ao Pexels não está configurada.", estado: 503 };
  const q = termo.trim().slice(0, 100);
  if (q.length < 2) return { ok: true, fotos: [], mais: false };
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "15");
  url.searchParams.set("page", String(Math.min(50, Math.max(1, Math.floor(pagina) || 1))));
  url.searchParams.set("orientation", "portrait");
  let res: Response;
  try { res = await fetch(url, { headers: { Authorization: chave } }); } catch { return { ok: false, erro: "O Pexels não respondeu. Tenta outra vez.", estado: 502 }; }
  if (res.status === 429) return { ok: false, erro: "Limite de pesquisas do Pexels atingido. Tenta daqui a pouco.", estado: 429 };
  if (!res.ok) return { ok: false, erro: "A pesquisa no Pexels falhou. Tenta outra vez.", estado: 502 };
  const j = await res.json().catch(() => null) as { next_page?: string } | null;
  return { ok: true, fotos: mapearFotos(j), mais: !!j?.next_page };
}

export async function descarregarPexels(url: string): Promise<Uint8Array> {
  if (!urlPexelsValido(url)) throw new Error("Endereço de imagem inválido.");
  const res = await fetch(urlDescarga(url), { redirect: "error" }).catch(() => null);
  if (!res || !res.ok) throw new Error("Não foi possível descarregar a foto do Pexels.");
  const b = new Uint8Array(await res.arrayBuffer());
  if (b.length > LIMITES_IMAGEM.maxBytes) throw new Error("A foto é demasiado grande.");
  return b;
}
