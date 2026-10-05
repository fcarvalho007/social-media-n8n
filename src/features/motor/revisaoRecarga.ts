/** Review shows server versions: reload only when a pending save settles as "guardado" while on that step. */
export function deveRecarregarRevisao(anterior: string, atual: string, passo: string): boolean {
  return passo === "revisao" && anterior !== "guardado" && atual === "guardado";
}
