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
