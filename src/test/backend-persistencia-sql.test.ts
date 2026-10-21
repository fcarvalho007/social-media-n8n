// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const db = new PGlite(), u = '00000000-0000-4000-8000-000000000001', p = '00000000-0000-4000-8000-000000000002', other = '00000000-0000-4000-8000-000000000003';
const rows = async <T = Record<string, unknown>>(s: string, a: unknown[] = []) => (await db.query<T>(s, a)).rows;
beforeAll(async () => {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid primary key);CREATE TABLE projects(id uuid primary key,owner_id uuid);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND owner_id=auth.uid()) $$;
 CREATE FUNCTION mc_pode_escrever(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT mc_pode_ler($1) AND coalesce(current_setting('test.editor',true),'true')='true' $$;
 CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid,bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated,service_role;GRANT SELECT ON storage.objects TO authenticated;
 `);
    await db.query('INSERT INTO auth.users VALUES($1)', [u]);
    await db.query('INSERT INTO projects VALUES($1,$2),($3,$3)', [p, u, other]);
    await db.exec(readFileSync('drizzle/migrations/0062_hub_backend_persistente.sql', 'utf8'));
    await db.exec(`SET test.uid='${u}'`);
}, 30000);
afterAll(() => db.close());
describe('persistência privada e trabalhos duráveis', () => {
    it('cria bucket privado e recusa escrita direta por clientes', async () => {
        expect((await rows('SELECT public FROM storage.buckets WHERE id=\'hub-documentos\''))[0].public).toBe(false);
        await db.exec('SET ROLE authenticated');
        await expect(rows('INSERT INTO hub_operacao(project_id) VALUES($1)', [p])).rejects.toMatchObject({ code: '42501' });
        await db.exec('RESET ROLE');
    });
    it('isola dados de projetos e não abre leitura anónima', async () => {
        await db.query('INSERT INTO hub_operacao(project_id,pausado,atualizado_em) VALUES($1,true,now()),($2,false,now())', [p, other]);
        await db.exec('SET ROLE authenticated');
        expect(await rows('SELECT project_id FROM hub_operacao')).toEqual([{ project_id: p }]);
        await db.exec('SET ROLE anon');
        await expect(rows('SELECT * FROM hub_operacao')).rejects.toMatchObject({ code: '42501' });
        await db.exec('RESET ROLE');
    });
    it('mantém operações pausadas e valida editor antes de enfileirar', async () => {
        await db.exec('SET ROLE authenticated');
        await expect(rows("SELECT hub_enfileirar($1,'seo_ciclo','teste','{}')", [p])).rejects.toThrow('pausada');
        await db.exec("SET test.editor='false'");
        await expect(rows('SELECT hub_operacao_definir($1,false)', [p])).rejects.toMatchObject({ code: '42501' });
        await db.exec("SET test.editor='true';RESET ROLE");
    });
    it('enfileira uma vez, sem aceitar autoria forjada', async () => {
        await db.exec('SET ROLE authenticated');
        await rows('SELECT hub_operacao_definir($1,false)', [p]);
        const a = await rows<{
            id: string;
        }>("SELECT hub_enfileirar($1,'seo_ciclo','mesma-chave','{\"userId\":\"outro\"}') id", [p]);
        const b = await rows<{
            id: string;
        }>("SELECT hub_enfileirar($1,'seo_ciclo','mesma-chave','{}') id", [p]);
        expect(a[0].id).toBe(b[0].id);
        await db.exec('RESET ROLE');
        expect((await rows<{
            pedido: {
                userId: string;
            };
        }>('SELECT pedido FROM hub_jobs WHERE id=$1', [a[0].id]))[0].pedido.userId).toBe(u);
    });
    it('reserva atomicamente e só o token atual pode concluir', async () => {
        const j = (await rows<{
            id: string;
            lease_token: string;
        }>('SELECT * FROM hub_job_reservar()'))[0];
        expect(j.id).toBeTruthy();
        expect(await rows('SELECT * FROM hub_job_reservar()')).toHaveLength(0);
        expect((await rows<{
            ok: boolean;
        }>("SELECT hub_job_concluir($1,gen_random_uuid(),'concluido','{}') ok", [j.id]))[0].ok).toBe(false);
        expect((await rows<{
            ok: boolean;
        }>("SELECT hub_job_concluir($1,$2,'concluido','{}') ok", [j.id, j.lease_token]))[0].ok).toBe(true);
    });
    it('conserva incerteza após interrupção e não repete operações externas', async () => {
        await db.query("INSERT INTO hub_jobs(project_id,tipo,dedup,pedido,estado,lease_token,lease_ate) VALUES($1,'wordpress','incerto','{}','em_curso',gen_random_uuid(),now()-interval '1 second')", [p]);
        expect(await rows('SELECT * FROM hub_job_reservar()')).toHaveLength(0);
        expect((await rows("SELECT estado FROM hub_jobs WHERE dedup='incerto'"))[0].estado).toBe('incerto');
    });
    it('uma pausa bloqueia novos trabalhos e a renovação do trabalho em curso', async () => {
        await db.query("INSERT INTO hub_jobs(project_id,tipo,dedup,pedido) VALUES($1,'documentos_recolha','pausar','{}')", [p]);
        const j = (await rows<{
            id: string;
            lease_token: string;
        }>('SELECT * FROM hub_job_reservar()'))[0];
        await db.query('UPDATE hub_operacao SET pausado=true WHERE project_id=$1', [p]);
        expect((await rows<{
            ok: boolean;
        }>('SELECT hub_job_renovar($1,$2) ok', [j.id, j.lease_token]))[0].ok).toBe(false);
    });
    it('faz CAS do estado e impede libertar lease de outro processo', async () => {
        const token = (await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'seo') t", [p]))[0].t;
        expect(token).toBeTruthy();
        expect((await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'seo') t", [p]))[0].t).toBeNull();
        await rows("SELECT hub_lease_libertar($1,'seo',gen_random_uuid())", [p]);
        expect((await rows<{
            r: number;
        }>("SELECT hub_estado_guardar($1,0,'{}',$2) r", [p, token]))[0].r).toBe(1);
        await expect(rows("SELECT hub_estado_guardar($1,0,'{}',$2)", [p, token])).rejects.toMatchObject({ code: 'MC409' });
        await expect(rows("SELECT hub_estado_guardar($1,1,'{}',gen_random_uuid())", [p])).rejects.toMatchObject({ code: 'MC409' });
    });
    it('Storage só concede leitura ao projeto do utilizador e não aceita paths inválidos', async () => {
        await db.query("INSERT INTO storage.objects VALUES(gen_random_uuid(),'hub-documentos',$1),(gen_random_uuid(),'hub-documentos',$2),(gen_random_uuid(),'hub-documentos','invalid/path')", [`${p}/hash/original.pdf`, `${other}/hash/original.pdf`]);
        await db.exec('SET ROLE authenticated');
        expect((await rows('SELECT name FROM storage.objects')).map(r => r.name)).toEqual([`${p}/hash/original.pdf`]);
        await db.exec('RESET ROLE');
    });
});
describe('restauro transacional sem substituir dados', () => {
    const destino = '00000000-0000-4000-8000-000000000004';
    const tabelas = () => Object.fromEntries(['hub_editorial_estados', 'hub_editorial_artefactos', 'hub_documentos', 'hub_recolhas', 'hub_operacao', 'hub_jobs', 'hub_publicacoes'].map(t => [t, []]));
    it('recusa tabelas ausentes e proprietários de outro projeto', async () => {
        await rows('INSERT INTO projects VALUES($1,$2)', [destino, u]);
        await expect(rows('SELECT hub_restaurar($1,$2,$3)', [destino, u, JSON.stringify({ a: [] })])).rejects.toThrow('inválida');
        await expect(rows('SELECT hub_restaurar($1,$2,$3)', [destino, other, JSON.stringify(tabelas())])).rejects.toMatchObject({ code: '42501' });
    });
    it('recusa mistura de projetos e operações ativas', async () => {
        const a = tabelas();
        a.hub_operacao = [{ project_id: p, pausado: true, atualizado_em: new Date().toISOString() }] as never[];
        await expect(rows('SELECT hub_restaurar($1,$2,$3)', [destino, u, JSON.stringify(a)])).rejects.toThrow('mistura');
        a.hub_operacao = [{ project_id: destino, pausado: false, atualizado_em: new Date().toISOString() }] as never[];
        await expect(rows('SELECT hub_restaurar($1,$2,$3)', [destino, u, JSON.stringify(a)])).rejects.toThrow('pausadas');
    });
    it('restaura uma vez; a repetição nunca sobrepõe um projeto existente', async () => {
        const a = tabelas();
        a.hub_operacao = [{ project_id: destino, pausado: true, atualizado_em: new Date().toISOString() }] as never[];
        expect((await rows<{
            ok: boolean;
        }>('SELECT hub_restaurar($1,$2,$3) ok', [destino, u, JSON.stringify(a)]))[0].ok).toBe(true);
        await expect(rows('SELECT hub_restaurar($1,$2,$3)', [destino, u, JSON.stringify(a)])).rejects.toMatchObject({ code: 'MC409' });
    });
});
describe('barreira de cópia entre processos', () => {
    it('impede uma cópia durante edição e congela escritas enquanto a cópia está ativa', async () => {
        const projeto = crypto.randomUUID();
        await rows('INSERT INTO projects VALUES($1,$2)', [projeto, u]);
        await rows('INSERT INTO hub_operacao(project_id) VALUES($1)', [projeto]);
        const edicao = (await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'seo') t", [projeto]))[0].t;
        expect((await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'backup') t", [projeto]))[0].t).toBeNull();
        await rows("SELECT hub_lease_libertar($1,'seo',$2)", [projeto, edicao]);
        const copia = (await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'backup') t", [projeto]))[0].t;
        expect(copia).toBeTruthy();
        expect((await rows<{
            t: string;
        }>("SELECT hub_lease_reservar($1,'documentos') t", [projeto]))[0].t).toBeNull();
        await expect(rows('UPDATE hub_operacao SET pausado=false WHERE project_id=$1', [projeto])).rejects.toMatchObject({ code: 'MC409' });
        await rows("SELECT hub_lease_libertar($1,'backup',$2)", [projeto, copia]);
        await rows('UPDATE hub_operacao SET pausado=false WHERE project_id=$1', [projeto]);
    });
});
