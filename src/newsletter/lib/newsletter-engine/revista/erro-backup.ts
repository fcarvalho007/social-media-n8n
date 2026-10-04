/** Translates backup failures into readable pt-PT copy for the panel. */
export function mensagemErroBackup(e: unknown): string {
  const err = e as { name?: string; message?: string } | null;
  const nome = err?.name ?? "";
  const msg = err?.message ?? "";
  if (nome === "TimeoutError" || nome === "AbortError" || /timed? ?out|aborted/i.test(msg)) {
    return "DigitalSprint.pt demorou demasiado a responder. O envio não foi afetado. Tenta novamente.";
  }
  if (/fetch failed|network|ECONN|ENOTFOUND|EAI_AGAIN|socket|TLS|certificate/i.test(msg)) {
    return "Não foi possível contactar DigitalSprint.pt (site lento ou indisponível). O envio não foi afetado. Tenta novamente.";
  }
  return msg || "Falha inesperada no backup. O envio não foi afetado.";
}
