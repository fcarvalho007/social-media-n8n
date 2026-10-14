import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// The site publication must accept the secret names the owner already saved.
describe("ligação ao fredericocarvalho.pt", () => {
  const cronica = readFileSync("supabase/functions/_shared/newsletter-engine/revista/frederico-wordpress.server.ts", "utf8");
  const envio = readFileSync("supabase/functions/_shared/newsletter-engine/envio.server.ts", "utf8");
  it("a crónica aceita WORDPRESS_SITE_URL, wordpress_site_username e wordpress_site_key", () => {
    for (const n of ["WORDPRESS_SITE_URL", "wordpress_site_username", "wordpress_site_key"]) expect(cronica).toContain(`process.env["${n}"]`);
  });
  it("o backup DigitalSprint.pt usa dados próprios e nunca os da crónica", () => {
    const corpo = envio.slice(envio.indexOf("export async function publicarWordpress"));
    const fn = corpo.slice(0, corpo.indexOf("\n}\n"));
    for (const n of ["DIGITALSPRINT_WP_URL", "DIGITALSPRINT_WP_USER", "DIGITALSPRINT_WP_APP_PASSWORD"]) expect(fn).toContain(`process.env.${n}`);
    for (const n of ["WORDPRESS_SITE_URL", "wordpress_site_username", "wordpress_site_key"]) expect(fn).not.toContain(n);
  });
});
