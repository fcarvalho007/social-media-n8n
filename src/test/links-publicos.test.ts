import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Every runtime link (newsletter and social) must come from the configured public address,
// never from a hardcoded app/preview host, so both areas cannot diverge.
function ficheiros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? ficheiros(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe("endereços públicos", () => {
  it("nenhuma função do servidor tem um endereço da app escrito à mão", () => {
    const ofensores = ficheiros("supabase/functions").filter((f) => /https?:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.lovable\.app/i.test(readFileSync(f, "utf8")));
    expect(ofensores).toEqual([]);
  });
  it("avisos sociais usam a mesma configuração da newsletter", () => {
    const helper = readFileSync("supabase/functions/_shared/app-publico.ts", "utf8");
    expect(helper).toContain("NL_PUBLIC_BASE_URL");
    for (const f of ["send_story_reminder", "notify-publication-failure", "generate_story_deeplink"]) {
      expect(readFileSync(`supabase/functions/${f}/index.ts`, "utf8")).toContain("_shared/app-publico.ts");
    }
  });
});
