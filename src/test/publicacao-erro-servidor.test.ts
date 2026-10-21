import { describe, it, expect } from 'vitest';
import { lerContextoErro } from '@/hooks/usePublishWithProgress';

describe('lerContextoErro', () => {
  it('lê o motivo real de uma recusa 403 vinda do servidor', async () => {
    const r = new Response(JSON.stringify({ error: { message: 'Sem permissão editorial.' } }), { status: 403 });
    const c = await lerContextoErro(r);
    expect(c?.status).toBe(403);
    expect(JSON.parse(c!.body!).error.message).toBe('Sem permissão editorial.');
  });
});
