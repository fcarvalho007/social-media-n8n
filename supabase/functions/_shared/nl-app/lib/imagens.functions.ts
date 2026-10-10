import { Buffer } from "node:buffer";
// Imagem da crónica (formato Revista): pesquisa no Pexels e cópia para o
// armazenamento da aplicação, para que o email nunca dependa de terceiros.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

export type { FotoPexels } from "./pexels-tipos.ts";
import type { FotoPexels } from "./pexels-tipos.ts";

/** Pesquisa fotografias no Pexels (a chave nunca sai do servidor). */
export const pesquisarPexelsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { termo: string; pagina?: number }) => d)
  .handler(async ({ data }): Promise<{ fotos: FotoPexels[]; erro?: string }> => {
    const { pesquisarPexels } = await import("./pexels.server.ts");
    return pesquisarPexels(data.termo, data.pagina ?? 1);
  });

function extensao(tipo: string): string {
  if (tipo.includes("png")) return "png";
  if (tipo.includes("webp")) return "webp";
  return "jpg";
}

async function guardar(
  edicaoId: string, bytes: ArrayBuffer, tipo: string,
): Promise<string> {
  const { supabaseAdmin } = await import("../_shim/admin.ts");
  const caminho = `${edicaoId}/cronica-${Date.now()}.${extensao(tipo)}`;
  const { error } = await supabaseAdmin.storage
    .from("nl-imagens-edicao")
    .upload(caminho, bytes, { contentType: tipo, upsert: true });
  if (error) throw new Error(`Não foi possível guardar a imagem: ${error.message}`);
  const { baseUrlEdicoes } = await import("../../newsletter-engine/revista/destinos.server.ts");
  return `${await baseUrlEdicoes()}/api/public/imagem/${caminho}`;
}

/** Copia uma foto do Pexels para o armazenamento e devolve o URL público. */
export const importarPexelsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string; url: string }) => d)
  .handler(async ({ data }): Promise<{ url: string }> => {
    if (!/^https:\/\/images\.pexels\.com\//.test(data.url)) {
      throw new Error("Origem de imagem não permitida.");
    }
    const res = await fetch(data.url);
    if (!res.ok) throw new Error("Não foi possível descarregar a imagem do Pexels.");
    const tipo = res.headers.get("content-type") ?? "image/jpeg";
    return { url: await guardar(data.edicaoId, await res.arrayBuffer(), tipo) };
  });

/** Guarda uma imagem carregada do computador (base64) e devolve o URL público. */
export const carregarImagemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string; base64: string; tipo: string }) => d)
  .handler(async ({ data }): Promise<{ url: string }> => {
    if (!/^image\/(jpeg|png|webp)$/.test(data.tipo)) {
      throw new Error("Usa uma imagem JPEG, PNG ou WebP.");
    }
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bin.byteLength > 8 * 1024 * 1024) throw new Error("A imagem não pode passar dos 8 MB.");
    return { url: await guardar(data.edicaoId, bin.buffer as ArrayBuffer, data.tipo) };
  });

/**
 * Devolve uma imagem em base64 para recorte no browser (evita bloqueios CORS).
 * Só aceita http(s) e imagens até 10 MB.
 */
export const obterImagemBase64Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<{ base64: string; tipo: string; erro?: never } | { base64?: never; tipo?: never; erro: string }> => {
    if (!/^https?:\/\//i.test(data.url)) return { erro: "Endereço de imagem inválido." };
    let res: Response;
    try {
      res = await fetch(data.url);
    } catch {
      return { erro: "Não foi possível obter a imagem original." };
    }
    // Uma imagem antiga pode já não existir. Isso impede o recorte, mas não
    // deve transformar uma operação opcional num erro 500 da aplicação.
    if (!res.ok) return { erro: "Não foi possível obter a imagem original." };
    const tipo = res.headers.get("content-type") ?? "image/jpeg";
    if (!tipo.startsWith("image/")) return { erro: "O endereço não é uma imagem." };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return { erro: "A imagem original é demasiado grande." };
    return { base64: Buffer.from(buf).toString("base64"), tipo };
  });
