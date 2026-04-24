const CONSUMING_POST_STATUSES = new Set([
  'published',
  'scheduled',
  'publishing',
  'waiting_for_approval',
  'approved',
]);

export interface DraftCandidate {
  id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
}

export interface PublicationCandidate {
  id: string;
  user_id: string | null;
  caption: string | null;
  status: string | null;
  created_at: string | null;
}

const normaliseCaption = (caption: string | null | undefined) => caption?.trim() || '';

export function isDraftConsumedByPublication(
  draft: DraftCandidate,
  publication: PublicationCandidate,
  successfulAttemptPostIds: Set<string> = new Set(),
) {
  if (!draft.user_id || publication.user_id !== draft.user_id) return false;
  if (!normaliseCaption(draft.caption) || normaliseCaption(draft.caption) !== normaliseCaption(publication.caption)) return false;
  if (!publication.created_at) return false;

  const draftTime = new Date(draft.created_at).getTime();
  const publicationTime = new Date(publication.created_at).getTime();
  if (!Number.isFinite(draftTime) || !Number.isFinite(publicationTime)) return false;

  const createdAfterDraftWindow = publicationTime >= draftTime - 5 * 60 * 1000;
  const statusConsumesDraft = publication.status ? CONSUMING_POST_STATUSES.has(publication.status) : false;
  const hasConfirmedSuccess = successfulAttemptPostIds.has(publication.id);

  return createdAfterDraftWindow && (statusConsumesDraft || hasConfirmedSuccess);
}

export function filterConsumedDrafts<TDraft extends DraftCandidate>(
  drafts: TDraft[],
  publications: PublicationCandidate[],
  successfulAttemptPostIds: Set<string> = new Set(),
) {
  return drafts.filter((draft) =>
    !publications.some((publication) => isDraftConsumedByPublication(draft, publication, successfulAttemptPostIds)),
  );
}