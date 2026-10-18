// @vitest-environment node
import { beforeAll, afterAll, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite(), u = crypto.randomUUID(), p = crypto.randomUUID();
beforeAll(async () => {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA cron;CREATE SCHEMA net;
CREATE TABLE auth.users(id uuid primary key);CREATE TABLE projects(id uuid primary key,owner_id uuid);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE FUNCTION mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND owner_id=auth.uid()) $$;CREATE FUNCTION mc_pode_escrever(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT mc_pode_ler($1) $$;
CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid,bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE TABLE cron.job(jobid bigserial,jobname text,active boolean default true);CREATE FUNCTION cron.schedule(jobname text,schedule text,command text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname)VALUES($1)RETURNING jobid $$;CREATE FUNCTION cron.alter_job(job_id bigint,active boolean) RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET active=$2 WHERE jobid=$1 $$;
CREATE TABLE net.pedidos(url text,headers jsonb);CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int)RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN INSERT INTO net.pedidos VALUES(url,headers);RETURN 1;END $$;`);
    await db.query('INSERT INTO auth.users VALUES($1)', [u]);
    await db.query('INSERT INTO projects VALUES($1,$2)', [p, u]);
    await db.exec(readFileSync('drizzle/migrations/0062_hub_backend_persistente.sql', 'utf8'));
    await db.exec(readFileSync('drizzle/migrations/0063_hub_worker_nuvem.sql', 'utf8'));
    await db.query("SELECT set_config('test.uid',$1,false)", [u]);
}, 30000);
afterAll(() => db.close());
it('instala o agendamento desligado e mantém o token privado', async () => {
    expect((await db.query<{
        active: boolean;
    }>('SELECT active FROM cron.job')).rows[0].active).toBe(false);
    await db.exec('SET ROLE authenticated');
    await expect(db.query('SELECT token FROM hub_worker_config')).rejects.toMatchObject({ code: '42501' });
    await expect(db.query("SELECT hub_worker_instalar('https://project.supabase.co/functions/v1/hub-editorial-worker')")).rejects.toMatchObject({ code: '42501' });
    await db.exec('RESET ROLE');
});
it('valida destino do cron, omissões da agenda e o proprietário', async () => { await expect(db.query("SELECT hub_worker_instalar('https://outro.example/funcoes')")).rejects.toThrow('inválido'); await db.exec('SET ROLE authenticated'); await expect(db.query('SELECT hub_agenda_documentos_definir($1,$2)', [p, JSON.stringify({ ativa: true, dias: [1] })])).rejects.toThrow('inválida'); await db.query('SELECT hub_agenda_documentos_definir($1,$2)', [p, JSON.stringify({ ativa: true, dias: [1], hora: '08:00' })]); await expect(db.query('SELECT hub_agenda_documentos_definir($1,$2)', [crypto.randomUUID(), JSON.stringify({ ativa: true, dias: [1], hora: '08:00' })])).rejects.toMatchObject({ code: '42501' }); await db.exec('RESET ROLE'); });
it('não chama a função quando está desligado ou sem projeto ativo', async () => { await db.query("SELECT hub_worker_instalar('https://project.supabase.co/functions/v1/hub-editorial-worker')"); await db.query('SELECT hub_worker_acordar()'); expect((await db.query('SELECT * FROM net.pedidos')).rows).toHaveLength(0); await db.exec('UPDATE hub_worker_config SET ativo=true'); await db.query('SELECT hub_worker_acordar()'); expect((await db.query('SELECT * FROM net.pedidos')).rows).toHaveLength(0); await db.query('UPDATE hub_operacao SET pausado=false WHERE project_id=$1', [p]); await db.query('SELECT hub_worker_acordar()'); expect((await db.query('SELECT * FROM net.pedidos')).rows).toHaveLength(1); });
