import { describe, expect, it } from "vitest";
import { limparResumoPodcast, RESUMO_PODCAST_MAX } from "@/newsletter/lib/resumo-podcast";

describe("resumo de duas linhas do podcast", () => {
  it("nunca passa dos 200 caracteres", () => {
    const longo = "Uma conversa sobre marketing digital e pequenas empresas ".repeat(10);
    expect([...limparResumoPodcast(longo)].length).toBeLessThanOrEqual(RESUMO_PODCAST_MAX + 1);
    expect(RESUMO_PODCAST_MAX).toBe(200);
  });

  it("remove links e emojis", () => {
    expect(limparResumoPodcast("Ouve já 🎙️ em https://exemplo.pt/ep agora")).toBe("Ouve já em agora");
  });
});

import { extrairTextoEpisodio, urlEpisodioPermitido } from "@/newsletter/lib/resumo-podcast";

describe("leitura da página do episódio", () => {
  it("só aceita o site do podcast", () => {
    expect(urlEpisodioPermitido("https://www.marketingporidiotas.pt/podcast/x/")).toBe(true);
    expect(urlEpisodioPermitido("https://exemplo.com/podcast/x/")).toBe(false);
    expect(urlEpisodioPermitido("http://marketingporidiotas.pt/x")).toBe(false);
  });
  it("extrai o texto do episódio sem scripts nem relacionados", () => {
    const html = `<nav>Menu</nav><div class="qodef-e qodef-podcast-content"><script>x()</script><p>Neste episódio o Frederico fala de IA &#8211; e SEO.</p></div><div class="qodef-podcast-hosts">Hosts</div>`;
    expect(extrairTextoEpisodio(html)).toBe("Neste episódio o Frederico fala de IA – e SEO.");
  });
});
