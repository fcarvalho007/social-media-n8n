// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolverPublico, validarDestino } from '../../scripts/documentos/obter';
import { downloadConhecido } from '../../scripts/documentos/adaptadores';

describe('download local: isolamento da rede', () => {
  it('usa a API pública DSpace apenas no host exato do repositório verificado',()=>{
    const caminho='/bitstreams/4df724a5-2e0d-4e66-bcb8-1d3bf4e22390/download';
    expect(downloadConhecido(`https://openknowledge.worldbank.org${caminho}`)).toBe('https://openknowledge.worldbank.org/server/api/core/bitstreams/4df724a5-2e0d-4e66-bcb8-1d3bf4e22390/content');
    expect(downloadConhecido(`https://openknowledge.worldbank.org.evil.org${caminho}`)).toContain('evil.org');
  });
  it.each(['http://example.org/a.pdf', 'https://localhost/a', 'https://127.0.0.1/a', 'https://0x7f000001/a', 'https://[::1]/a', 'https://example.org:8443/a', 'https://u:pass@example.org/a', 'https://api.internal/a'])('recusa %s', u => expect(() => validarDestino(u)).toThrow());
  it('aceita HTTPS público sem exigir a extensão .pdf', () => expect(validarDestino('https://example.org/download?id=4#page=2').href).toBe('https://example.org/download?id=4'));
  it.each(['127.0.0.1', '10.0.0.5', '169.254.169.254', '192.168.1.2', '::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '2002:7f00:1::', '2001:0:1234::1'])('recusa resolução para %s', async ip => {
    await expect(resolverPublico(new URL('https://example.org'), async () => [{ address: ip, family: ip.includes(':') ? 6 : 4 }])).rejects.toThrow('privada');
  });
  it('recusa DNS misto, mesmo se a primeira resposta é pública', async () => {
    await expect(resolverPublico(new URL('https://example.org'), async () => [{ address: '1.1.1.1', family: 4 }, { address: '10.0.0.1', family: 4 }])).rejects.toThrow();
  });
  it('devolve um endereço validado para fixar a ligação TLS', async () => {
    await expect(resolverPublico(new URL('https://example.org'), async () => [{ address: '1.1.1.1', family: 4 }])).resolves.toEqual({ address: '1.1.1.1', family: 4 });
  });
});
