import { JSDOM, VirtualConsole } from 'jsdom';
import { createHash } from 'node:crypto';
import { obterPublico } from '../documentos/obter';
import { Robots } from '../documentos/robots';
import { extrairArtigoDocumento } from '../../src/features/documentos/descoberta';
import type { MarkupDocumento, ArtigoFonteLido } from '../../src/features/documentos/contratos';
export async function extrairArtigoPublico(url: string, item: {
    nomeFonte: string;
    origem: string;
    publicadoEm: string | null;
}): Promise<ArtigoFonteLido> {
    const robots = new Robots(), r = await obterPublico(url, AbortSignal.timeout(30000), { antesDeVisitar: u => robots.verificar(u) });
    const dom = new JSDOM(r.bytes.toString('utf8'), { virtualConsole: new VirtualConsole() });
    try {
        return { ...extrairArtigoDocumento(dom.window.document as unknown as MarkupDocumento), url: r.url, origem: item.origem, fonteNome: item.nomeFonte, publicadoEm: item.publicadoEm, hash: createHash('sha256').update(r.bytes).digest('hex') };
    }
    finally {
        dom.window.close();
    }
}
