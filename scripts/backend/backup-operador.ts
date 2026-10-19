import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarBackup, verificarBackup, type CopiaHub } from './backup';
/** Portable, independent copy: database manifest AND actual original/cover binaries. */
export async function exportarCopia(sb: SupabaseClient, projeto: string, pasta: string) {
    const b = await criarBackup(sb, projeto);
    await mkdir(pasta, { mode: 0o700 });
    await mkdir(path.join(pasta, 'objetos'), { mode: 0o700 });
    for (const o of b.objetos) {
        const r = await sb.storage.from(o.bucket??'hub-documentos').download(o.path);
        if (r.error || !r.data)
            throw new Error('Cópia incompleta: falta um binário.');
        const bytes = new Uint8Array(await r.data.arrayBuffer());
        if (createHash('sha256').update(bytes).digest('hex') !== o.hash || bytes.length !== o.bytes)
            throw new Error('O ficheiro não corresponde ao manifesto.');
        await writeFile(path.join(pasta, 'objetos', o.hash), bytes, { mode: 0o600 });
    }
    // Manifest is the final commit marker: incomplete folders cannot be restored.
    await writeFile(path.join(pasta, 'manifesto.json'), JSON.stringify(b), { mode: 0o600, flag: 'wx' });
    return { hash: b.hash, objetos: b.objetos.length };
}
export function prepararRestauro(c: CopiaHub, projeto: string, owner: string) {
    verificarBackup(c);
    if (!/^[a-f0-9-]{36}$/.test(projeto) || !/^[a-f0-9-]{36}$/.test(owner) || projeto === c.projeto)
        throw new Error('Usa um projeto de destino novo e vazio.');
    const tabelas:Record<string,Record<string,unknown>[]> = {...structuredClone(c.tabelas),hub_artigo_imagens:structuredClone(c.tabelas.hub_artigo_imagens??[]),hub_wp_imagens:structuredClone(c.tabelas.hub_wp_imagens??[])}, ids = new Map<string, string>();
    for (const t of ['hub_documentos', 'hub_recolhas', 'hub_jobs', 'hub_publicacoes','hub_artigo_imagens'])
        for (const r of tabelas[t])
            ids.set(String(r.id), randomUUID());
    for (const [t, linhas] of Object.entries(tabelas))
        for (const r of linhas) {
            r.project_id = projeto;
            if (typeof r.id === 'string' && ids.has(r.id))
                r.id = ids.get(r.id);
            if(t==='hub_artigo_imagens')r.caminho=String(r.caminho).replace(`${c.projeto}/`,`${projeto}/`);
            if(t==='hub_publicacoes')r.evento_estado=r.estado;
            if (t === 'hub_documentos') {
                r.pdf_path = String(r.pdf_path).replace(`${c.projeto}/`, `${projeto}/`);
                if (r.capa_path)
                    r.capa_path = String(r.capa_path).replace(`${c.projeto}/`, `${projeto}/`);
                r.criado_por = owner;
                const d = r.dados as Record<string, unknown>;
                d.id = r.id;
                d.ambito = JSON.stringify([owner, projeto]);
            }
            if (t === 'hub_recolhas') {
                const d = r.dados as Record<string, unknown>;
                d.id = r.id;
                d.ambito = JSON.stringify([owner, projeto]);
                if (typeof d.documentoId === 'string')
                    d.documentoId = ids.get(d.documentoId) ?? d.documentoId;
            }
            if (t === 'hub_jobs') {
                r.lease_token = null;
                r.lease_ate = null;
                if (['fila', 'em_curso'].includes(String(r.estado)))
                    r.estado = 'cancelado';
                const p = r.pedido as Record<string, unknown>;
                if (p.userId)
                    p.userId = owner;
                if (typeof p.retomaDe === 'string')
                    p.retomaDe = ids.get(p.retomaDe) ?? p.retomaDe;
                const resultado = r.resultado as Record<string, unknown> | null;
                if (resultado) {
                    if (resultado.id)
                        resultado.id = r.id;
                    if (resultado.ambito)
                        resultado.ambito = JSON.stringify([owner, projeto]);
                    if (Array.isArray(resultado.pdfs))
                        for (const pdf of resultado.pdfs)
                            if (pdf.documentoId)
                                pdf.documentoId = ids.get(pdf.documentoId) ?? pdf.documentoId;
                }
            }
            if (t === 'hub_operacao')
                r.pausado = true;
            if (t === 'hub_editorial_estados') {
                const dados=r.dados as import('../../src/features/seo/contratos').EstadoSeo;
                if(dados.integracoes)dados.integracoes.destinos.forEach(d=>d.ativo=false);
                for(const v of dados.eventos??[])v.entregas=[];
                for(const p of dados.pautas)for(const t of [p.texto,p.proposta])if(t?.imagem?.id)t.imagem.id=ids.get(t.imagem.id)??t.imagem.id;
                const refs=[...dados.pautas.flatMap(p=>[...p.fontes,...p.propostaFontes??[]]),...dados.sites.flatMap(s=>s.conhecimento?.referencias??[]),...(dados.glossarios??[]).flatMap(g=>g.fontes)];
                for(const f of refs)if(f.documento)f.documento.id=ids.get(f.documento.id)??f.documento.id;
                const e = r.dados as {
                    configuracao: {
                        pausado: boolean;
                        automacaoPausada: boolean;
                    };
                    pautas: {
                        aprovacao: unknown;
                        estado: string;
                    }[];
                };
                e.configuracao.pausado = true;
                e.configuracao.automacaoPausada = true;
                for (const p of e.pautas) {
                    p.aprovacao = null;
                    if (['aprovado', 'pronto_automatico', 'a_preparar'].includes(p.estado))
                        p.estado = 'aguarda_revisao';
                }
            }
        }
    return tabelas;
}
export async function restaurarCopia(sb: SupabaseClient, pasta: string, projeto: string, owner: string) {
    const manifesto = path.join(pasta, 'manifesto.json');
    if ((await stat(manifesto)).size > 100 * 1024 * 1024)
        throw new Error('Manifesto demasiado grande.');
    const c = verificarBackup(JSON.parse(await readFile(manifesto, 'utf8')) as CopiaHub), tabelas = prepararRestauro(c, projeto, owner);
    // Validate every local object before the first cloud write.
    for (const o of c.objetos) {
        if (o.bytes > 50 * 1024 * 1024 || (await stat(path.join(pasta, 'objetos', o.hash))).size !== o.bytes)
            throw new Error('Objeto incompleto.');
        const bytes = await readFile(path.join(pasta, 'objetos', o.hash));
        if (createHash('sha256').update(bytes).digest('hex') !== o.hash)
            throw new Error('Hash do objeto inválido.');
    }
    for (const o of c.objetos) {
        const bytes = await readFile(path.join(pasta, 'objetos', o.hash)), destino = o.path.replace(`${c.projeto}/`, `${projeto}/`);
        const r = await sb.storage.from(o.bucket??'hub-documentos').upload(destino, bytes, { contentType: destino.endsWith('.pdf') ? 'application/pdf' : destino.endsWith('.jpg')?'image/jpeg':destino.endsWith('.webp')?'image/webp':'image/png', upsert: false });
        if (r.error) {
            const anterior = await sb.storage.from(o.bucket??'hub-documentos').download(destino);
            if (anterior.error || !anterior.data || createHash('sha256').update(new Uint8Array(await anterior.data.arrayBuffer())).digest('hex') !== o.hash)
                throw new Error('Não foi possível confirmar todos os binários de destino.');
        }
    }
    const r = await sb.rpc('hub_restaurar', { _projeto: projeto, _owner: owner, _tabelas: tabelas });
    if (r.error || r.data !== true)
        throw new Error('Restauro recusado. O projeto de destino tem de estar vazio; nenhum dado existente é substituído.');
    return { projeto, objetos: c.objetos.length, hashOrigem: c.hash, pausado: true };
}
