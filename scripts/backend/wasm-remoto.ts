const URL_PDFIUM = 'https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.1/dist/pdfium.wasm';
/** Only engine bytes leave the CDN. Documents are never transmitted there. */
export async function carregarWasm(hashEsperado: string, pedir: typeof fetch = fetch): Promise<Uint8Array> {
    if (!/^[a-f0-9]{64}$/.test(hashEsperado)) throw new Error('Assinatura do motor PDF inválida.');
    const r = await pedir(URL_PDFIUM, { signal: AbortSignal.timeout(20000), redirect: 'error' });
    const maximo = 6 * 1024 * 1024;
    if (!r.ok || !r.body || Number(r.headers.get('content-length') ?? 0) > maximo) throw new Error('Motor PDF temporariamente indisponível.');
    const leitor = r.body.getReader(), partes: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await leitor.read(); if (done) break;
            total += value.byteLength;
            if (total > maximo) { await leitor.cancel(); throw new Error('O motor PDF excede o tamanho permitido.'); }
            partes.push(value);
        }
    } finally { leitor.releaseLock(); }
    const b = new Uint8Array(total); let posicao = 0;
    for (const p of partes) { b.set(p, posicao); posicao += p.length; }
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b.buffer)), v => v.toString(16).padStart(2, '0')).join('');
    if (hash !== hashEsperado) throw new Error('Assinatura do motor PDF inválida.');
    return b;
}
