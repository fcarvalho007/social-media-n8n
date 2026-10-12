import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// The site publication must accept the secret names the owner already saved.
describe("ligação ao fredericocarvalho.pt", () => {
  const cronica = readFileSync("supabase/functions/_shared/newsletter-engine/revista/frederico-wordpress.server.ts", "utf8");
  const envio = readFileSync("supabase/functions/_shared/newsletter-engine/envio.server.ts", "utf8");
  it("a crónica aceita WORDPRESS_SITE_URL, wordpress_site_username e wordpress_site_key", () => {
    for (const n of ["WORDPRESS_SITE_URL", "wordpress_site_username", "wordpress_site_key"]) expect(cronica).toContain(`process.env["${n}"]`);
  });
  it("o envio aceita os mesmos nomes", () => {
    expect(envio).toContain("process.env.wordpress_site_username");
    expect(envio).toContain("process.env.wordpress_site_key");
  });
});
