import { describe, expect, it } from "vitest";
import { buildPdfStoragePath } from "@/hooks/usePublishWithProgress";

describe("PDF do LinkedIn", () => {
  it("a mesma legenda em tentativas diferentes nunca colide com um PDF anterior", () => {
    const a = buildPdfStoragePath("u1", "Procuras aquela ferramenta?", 1);
    const b = buildPdfStoragePath("u1", "Procuras aquela ferramenta?", 2);
    expect(a).not.toBe(b);
    expect(a.startsWith("u1/1/")).toBe(true);
    expect(a.endsWith(".pdf")).toBe(true);
  });
});
