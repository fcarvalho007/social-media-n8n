import { describe, expect, it } from 'vitest';
import { filterConsumedDrafts, isDraftConsumedByPublication } from './reconciliation';

const draft = {
  id: 'draft-1',
  user_id: 'user-1',
  caption: 'Legenda final',
  created_at: '2026-04-23T21:30:00.000Z',
};

describe('draft reconciliation', () => {
  it('considers a draft consumed when a later post with the same caption was published', () => {
    expect(isDraftConsumedByPublication(draft, {
      id: 'post-1',
      user_id: 'user-1',
      caption: 'Legenda final',
      status: 'published',
      created_at: '2026-04-23T22:10:00.000Z',
    })).toBe(true);
  });

  it('considers a failed post consumed when at least one attempt succeeded', () => {
    expect(isDraftConsumedByPublication(draft, {
      id: 'post-1',
      user_id: 'user-1',
      caption: 'Legenda final',
      status: 'failed',
      created_at: '2026-04-23T22:10:00.000Z',
    }, new Set(['post-1']))).toBe(true);
  });

  it('keeps unrelated drafts visible', () => {
    const visible = filterConsumedDrafts([draft], [{
      id: 'post-1',
      user_id: 'user-1',
      caption: 'Outra legenda',
      status: 'published',
      created_at: '2026-04-23T22:10:00.000Z',
    }]);

    expect(visible).toHaveLength(1);
  });
});