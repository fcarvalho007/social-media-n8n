import { describe, expect, it } from "vitest";
import { alvoEliminacaoPainel } from "@/services/conteudoPainel";

describe("eliminação no Painel", () => {
  it("encaminha cada tipo para a origem correta", () => {
    expect(alvoEliminacaoPainel("draft")).toEqual({ tabela: "posts_drafts", nome: "rascunho", limpaAgendamento: false });
    expect(alvoEliminacaoPainel("post")).toEqual({ tabela: "posts", nome: "publicação", limpaAgendamento: false });
    expect(alvoEliminacaoPainel("carousel")).toEqual({ tabela: "posts", nome: "carrossel", limpaAgendamento: false });
    expect(alvoEliminacaoPainel("story")).toEqual({ tabela: "stories", nome: "story", limpaAgendamento: false });
  });

  it("remove também o trabalho associado a uma publicação agendada", () => {
    expect(alvoEliminacaoPainel("scheduled")).toEqual({ tabela: "posts", nome: "publicação agendada", limpaAgendamento: true });
  });
});