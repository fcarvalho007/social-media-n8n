import type { Notification } from '@/hooks/useNotifications';

type ReferenciaNotificacao = Pick<Notification, 'related_entity_type' | 'related_entity_id'>;
type ConsultarProjetoTarefa = (id: string) => Promise<string | null>;

/** Task lookup runs through the signed-in client's RLS; no task/project data is guessed. */
export async function destinoNotificacao(n: ReferenciaNotificacao, consultarProjetoTarefa: ConsultarProjetoTarefa): Promise<string | null> {
  const id = n.related_entity_id;
  if (!id) return null;
  if (n.related_entity_type === 'project') return `/projects/${encodeURIComponent(id)}`;
  if (n.related_entity_type !== 'task') return null;
  const projetoId = await consultarProjetoTarefa(id);
  if (!projetoId) throw new Error('A tarefa já não está disponível ou não tens acesso ao projeto.');
  return `/projects/${encodeURIComponent(projetoId)}`;
}
