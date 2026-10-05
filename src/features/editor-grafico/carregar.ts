// Local image upload for the editor: checks type by signature, size and dimensions before anything is sent.
// WebP and files above the stored-asset limit are re-encoded in the browser (pixels only, metadata dropped);
// the server re-validates the final PNG/JPEG bytes and stores them as an immutable project asset.
import { carregarImagemServidor, lerAssets } from "@/services/motor";
import type { Asset } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

export const LIMITES_CARREGAR = { maxBytes: 10 * 1024 * 1024, maxGuardado: 6 * 1024 * 1024, maxLado: 8000, maxPixeis: 40_000_000, ladoReduzido: 4000 } as const;
export const MIME_CARREGAR = ["image/jpeg", "image/png", "image/webp"] as const;
export type MimeCarregar = (typeof MIME_CARREGAR)[number];
export const ACEITAR_CARREGAR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Real type from the first bytes; SVG, GIF, HTML or anything else returns null. */
export function assinatura(b: Uint8Array): MimeCarregar | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/** Checks before decoding: declared type, size and signature must agree. Returns an error message or the real type. */
export function validarFicheiro(f: { type: string; size: number }, cabecalho: Uint8Array): { ok: true; mime: MimeCarregar } | { ok: false; erro: string } {
  if (f.size <= 0) return { ok: false, erro: "O ficheiro está vazio." };
  if (f.size > LIMITES_CARREGAR.maxBytes) return { ok: false, erro: "A imagem ultrapassa 10 MB." };
  if (!(MIME_CARREGAR as readonly string[]).includes(f.type)) return { ok: false, erro: "Só são aceites imagens JPG, PNG ou WebP." };
  const real = assinatura(cabecalho);
  if (!real) return { ok: false, erro: "O ficheiro não é uma imagem JPG, PNG ou WebP válida." };
  if (real !== f.type) return { ok: false, erro: "O tipo do ficheiro não corresponde ao conteúdo." };
  return { ok: true, mime: real };
}

export function validarDimensoes(l: number, a: number): string | null {
  if (l < 1 || a < 1 || l > LIMITES_CARREGAR.maxLado || a > LIMITES_CARREGAR.maxLado) return "Dimensões fora do limite (máx. 8000 px por lado).";
  if (l * a > LIMITES_CARREGAR.maxPixeis) return "A imagem tem píxeis a mais (máx. 40 MP).";
  return null;
}

function base64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

async function recodificar(bmp: ImageBitmap, mime: MimeCarregar): Promise<Uint8Array> {
  const lado = Math.max(bmp.width, bmp.height);
  const k = lado > LIMITES_CARREGAR.ladoReduzido ? LIMITES_CARREGAR.ladoReduzido / lado : 1;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("O navegador não conseguiu preparar a imagem.");
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const tentar = (tipo: string, q?: number) => new Promise<Blob | null>((r) => c.toBlob(r, tipo, q));
  // PNG keeps transparency; JPEG for photos or when PNG is too big.
  const candidatos: Array<[string, number | undefined]> = mime === "image/jpeg" ? [["image/jpeg", 0.9], ["image/jpeg", 0.8]] : [["image/png", undefined], ["image/jpeg", 0.9], ["image/jpeg", 0.8]];
  for (const [tipo, q] of candidatos) {
    const b = await tentar(tipo, q);
    if (b && b.size <= LIMITES_CARREGAR.maxGuardado) return new Uint8Array(await b.arrayBuffer());
  }
  throw new Error("Não foi possível reduzir a imagem para menos de 6 MB. Usa uma imagem mais pequena.");
}

/** Validates, prepares and uploads one file; returns the verified project asset. */
export async function carregarFicheiro(projectId: string, f: File): Promise<{ asset: Asset; nome: string }> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  const v = validarFicheiro(f, bytes.subarray(0, 16));
  if (!v.ok) throw new Error(v.erro);
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(new Blob([bytes], { type: v.mime })); } catch { throw new Error("A imagem está corrompida ou não pode ser lida."); }
  try {
    const e = validarDimensoes(bmp.width, bmp.height);
    if (e) throw new Error(e);
    const final = v.mime === "image/webp" || bytes.length > LIMITES_CARREGAR.maxGuardado ? await recodificar(bmp, v.mime) : bytes;
    const r = await carregarImagemServidor(projectId, f.name, base64(final));
    const a = (await lerAssets(projectId, [r.asset.id])).assets[r.asset.id];
    if (!a) throw new Error("A imagem foi guardada mas não pôde ser lida. Tenta de novo.");
    return { asset: a, nome: r.asset.nome ?? f.name };
  } finally { bmp.close(); }
}

/** First allowed image file of a drag, or null when the drag carries no files. */
export function ficheiroDoArrasto(dt: DataTransfer): File | null {
  return dt.files && dt.files.length ? dt.files[0] : null;
}
