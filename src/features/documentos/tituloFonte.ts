/** Keep the publisher's title; discard download counters and surrounding link boilerplate. */
export function tituloCandidato(titulo: string): string {
  const citado=titulo.match(/^\s*(?:descarregar|download)\s*[“"«]([^”"»]+)[”"»]/i);
  return (citado?.[1]??titulo).trim();
}
