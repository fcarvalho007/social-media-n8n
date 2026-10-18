interface RespostaEmail {
  data?: { id?: unknown } | null;
  error?: { message?: string } | null;
}
interface RespostaGravacao {
  data?: unknown;
  error?: { message?: string } | null;
}

/** A resolved SDK promise is not evidence that the provider accepted the email. */
export function confirmarRespostaEmail(resposta: RespostaEmail): string {
  if (resposta.error) throw new Error(`O serviço de email recusou o envio: ${resposta.error.message || 'erro sem detalhe'}`);
  const id = resposta.data?.id;
  if (typeof id !== 'string' || !id.trim()) throw new Error('O serviço de email não confirmou o envio.');
  return id;
}

/** Both test and scheduled sends persist success only after a provider id exists. */
export async function enviarEmailERegistar(
  enviar: () => PromiseLike<RespostaEmail>,
  registar: () => PromiseLike<RespostaGravacao>,
): Promise<string> {
  const id = confirmarRespostaEmail(await enviar());
  const gravacao = await registar();
  if (gravacao.error) throw new Error(`Email aceite pelo serviço; não foi possível guardar a confirmação: ${gravacao.error.message || 'erro sem detalhe'}`);
  if (!gravacao.data) throw new Error('Email aceite pelo serviço; o servidor não confirmou o registo.');
  return id;
}

/** A test never changes the user's channel, weekdays or quiet hours. */
export function registoTesteEmail(userId: string, agora = new Date()) {
  return { user_id: userId, email_tested_at: agora.toISOString() };
}
