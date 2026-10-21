// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { carregarWasm } from '../../scripts/backend/wasm-remoto';
it('carrega apenas o binário versionado e confirma a assinatura antes de o usar', async () => { const bytes = Buffer.from('motor-verificavel'), h = createHash('sha256').update(bytes).digest('hex'), pedir = vi.fn(async () => new Response(bytes)); expect(Buffer.from(await carregarWasm(h, pedir)).equals(bytes)).toBe(true); expect(pedir).toHaveBeenCalledWith('https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.1/dist/pdfium.wasm', expect.objectContaining({ redirect: 'error' })); });
it('recusa um binário alterado, respostas de erro e corpos excessivos', async () => { const h = '0'.repeat(64); await expect(carregarWasm(h, async () => new Response('alterado'))).rejects.toThrow('Assinatura'); await expect(carregarWasm(h, async () => new Response(null, { status: 503 }))).rejects.toThrow('indisponível'); await expect(carregarWasm(h, async () => new Response('x', { headers: { 'content-length': String(7 * 1024 * 1024) } }))).rejects.toThrow('indisponível'); });
