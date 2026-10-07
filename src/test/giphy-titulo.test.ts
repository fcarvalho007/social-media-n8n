import { describe, expect, it } from "vitest";
import { urlGiphy } from "../../supabase/functions/_shared/motor/giphy.server";
describe("GIPHY hostnames", () => {
  it("aceita subdomínios oficiais e recusa outros", () => {
    for (const h of ["media", "media0", "media4", "i"]) expect(urlGiphy(`https://${h}.giphy.com/media/x/200w.gif`)).toBe(true);
    expect(urlGiphy("http://media0.giphy.com/a.gif")).toBe(false);
    expect(urlGiphy("https://media0.giphy.com.evil.pt/a.gif")).toBe(false);
    expect(urlGiphy("https://giphy.com/a.gif")).toBe(false);
  });
});
