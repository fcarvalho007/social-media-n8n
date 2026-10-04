import { describe, it, expect } from "vitest";
import { decidirFronteira, identidadeNewsletter } from "./FronteiraProjeto";

const ds = { id: "i", chave: "digitalsprint", nome: "DIGITALSPRINT", tipo: "newsletter", project_id: "a" };

describe("fronteira da newsletter", () => {
  it("mostra no projeto dono e em todos", () => {
    expect(decidirFronteira(ds, "a").tipo).toBe("mostrar");
    expect(decidirFronteira(ds, null).tipo).toBe("mostrar");
  });
  it("não mostra sob outro projeto", () => {
    expect(decidirFronteira(ds, "b")).toEqual({ tipo: "outro_projeto", projetoDono: "a" });
    expect(decidirFronteira({ ...ds, project_id: null }, "b").tipo).toBe("outro_projeto");
  });
  it("sem identidade não finge pertença", () => {
    expect(identidadeNewsletter([{ ...ds, tipo: "marca" }])).toBeNull();
    expect(decidirFronteira(null, "a").tipo).toBe("sem_identidade");
  });
});
