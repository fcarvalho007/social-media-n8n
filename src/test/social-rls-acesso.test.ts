import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "drizzle/migrations");
const ficheiro = readdirSync(dir).find((f) => f.includes("social_rls_acesso_minimo"));
const sql = ficheiro ? readFileSync(join(dir, ficheiro), "utf8") : "";

const TABELAS = [
  "media_library", "stories", "posts", "estudio_identidades", "posts_drafts", "profiles",
  "linkedin_mention_cache", "hashtag_intelligence", "hashtag_metadata", "instagram_analytics", "instagram_profiles",
];

describe("acesso mínimo às tabelas sociais", () => {
  it("a migração existe", () => expect(sql.length).toBeGreaterThan(0));

  it("nenhuma política nova usa USING (true)", () => {
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it("todas as 11 tabelas têm leitura limitada a titular ou membro da equipa", () => {
    for (const t of TABELAS) {
      const re = new RegExp(`ON public\\.${t} FOR SELECT TO authenticated USING \\([^;]*social_membro\\(\\)`);
      expect(sql, t).toMatch(re);
    }
  });

  it("a leitura pública do Instagram é removida", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public read access to instagram_analytics"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public read access to instagram_profiles"');
  });

  it("media e publicações só se criam em nome próprio", () => {
    expect(sql).toMatch(/"media_criar"[^;]*WITH CHECK \(auth\.uid\(\) = user_id\);/);
    expect(sql).toMatch(/"posts_criar"[^;]*WITH CHECK \(auth\.uid\(\) = user_id\);/);
  });
});

describe("estado da campanha E-goi", () => {
  it("usa a listagem por campaign_hash e não a ficha que responde 403", () => {
    const src = readFileSync(join(process.cwd(), "supabase/functions/_shared/newsletter-engine/egoi.server.ts"), "utf8");
    const corpo = src.slice(src.indexOf("export async function estadoCampanha"), src.indexOf("export async function estadoCampanha") + 600);
    expect(corpo).toContain("consultarEstadoCampanha");
    expect(corpo).not.toContain("/campaigns/email/${hash}`, { method: \"GET\"");
  });
});

describe("pastas de ficheiros públicas", () => {
  const f = readdirSync(dir).find((x) => x.includes("storage_buckets_publicos_acesso_minimo"));
  const s = f ? readFileSync(join(dir, f), "utf8") : "";
  it("pdfs: alterar e apagar só na própria pasta ou pela equipa editora", () => {
    expect(s).toMatch(/"pdfs_actualizar_proprio_ou_equipa"[^;]*\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text OR public\.social_pode_escrever\(\)/);
    expect(s).toMatch(/"pdfs_apagar_proprio_ou_equipa"[^;]*\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text OR public\.social_pode_escrever\(\)/);
    expect(s).toContain('DROP POLICY IF EXISTS "Users can upload files to pdfs"');
  });
  it("sem listagem anónima nem USING (true)", () => {
    expect(s).toContain('DROP POLICY IF EXISTS "Public can read individual files in public buckets"');
    expect(s).not.toMatch(/TO (anon|public)\b/i);
    expect(s).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});
