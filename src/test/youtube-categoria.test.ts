import { describe, expect, it } from "vitest";
import { networkOptionsValidator } from "@/lib/validation/validators/networkOptionsValidator";
import type { ValidatorContext } from "@/lib/validation/types";

const ctx = (youtube: Record<string, unknown>) =>
  ({ selectedFormats: ["youtube_shorts"], networkOptions: { youtube } } as unknown as ValidatorContext);
const temErro = async (y: Record<string, unknown>) =>
  (await networkOptionsValidator(ctx(y))).some((i) => i.id === "network-options:youtube:missing-category");

describe("categoria do YouTube", () => {
  it("Entretenimento escolhida não dá erro", async () => expect(await temErro({ categoryId: "24" })).toBe(false));
  it("sem categoria dá erro", async () => expect(await temErro({})).toBe(true));
});
