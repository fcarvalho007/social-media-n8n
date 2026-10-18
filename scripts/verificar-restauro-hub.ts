/** Offline drill: actual binaries + actual PostgreSQL migration and restore function. */
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { verificarBackup, type CopiaHub } from './backend/backup';
import { prepararRestauro } from './backend/backup-operador';
const pasta = process.argv[2];
if (!pasta)
    throw new Error('Indica a pasta da cópia portátil.');
const c = verificarBackup(JSON.parse(await readFile(path.join(pasta, 'manifesto.json'), 'utf8')) as CopiaHub);
for (const o of c.objetos) {
    const ficheiro = path.join(pasta, 'objetos', o.hash);
    if ((await stat(ficheiro)).size !== o.bytes || createHash('sha256').update(await readFile(ficheiro)).digest('hex') !== o.hash)
        throw new Error('Objeto da cópia ausente ou adulterado.');
}
const db = new PGlite(), projeto = randomUUID(), owner = randomUUID(), outro = randomUUID();
try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid primary key);CREATE TABLE projects(id uuid primary key,owner_id uuid);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND owner_id=auth.uid()) $$;
 CREATE FUNCTION mc_pode_escrever(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT mc_pode_ler($1) $$;
 CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid,bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated,service_role;GRANT SELECT ON storage.objects TO authenticated;`);
    await db.query('INSERT INTO auth.users VALUES($1),($2)', [owner, outro]);
    await db.query('INSERT INTO projects VALUES($1,$2)', [projeto, owner]);
    await db.exec(await readFile('drizzle/migrations/0062_hub_backend_persistente.sql', 'utf8'));
    const tabelas = prepararRestauro(c, projeto, owner);
    await db.query('SELECT hub_restaurar($1,$2,$3)', [projeto, owner, JSON.stringify(tabelas)]);
    const contagens: Record<string, number> = {};
    for (const t of Object.keys(tabelas)) {
        const n = (await db.query<{
            n: number;
        }>(`SELECT count(*)::int n FROM ${t}`)).rows[0].n;
        if (n !== tabelas[t].length)
            throw new Error('Contagem do restauro não corresponde ao manifesto.');
        contagens[t] = n;
    }
    await db.query("SELECT set_config('test.uid',$1,false)", [owner]);
    await db.exec('SET ROLE authenticated');
    const visiveis = (await db.query('SELECT id FROM hub_documentos')).rows.length;
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('test.uid',$1,false)", [outro]);
    await db.exec('SET ROLE authenticated');
    const estranhos = (await db.query('SELECT id FROM hub_documentos')).rows.length;
    await db.exec('RESET ROLE');
    if (visiveis !== tabelas.hub_documentos.length || estranhos !== 0)
        throw new Error('Falha no isolamento do restauro.');
    let recusado = false;
    try {
        await db.query('SELECT hub_restaurar($1,$2,$3)', [projeto, owner, JSON.stringify(tabelas)]);
    }
    catch {
        recusado = true;
    }
    if (!recusado)
        throw new Error('O restauro aceitou sobrescrever dados existentes.');
    const r = { em: new Date().toISOString(), hash: c.hash, objetosVerificados: c.objetos.length, contagens, rlsOutroUtilizador: estranhos, recusouSobrescrita: recusado, resultado: 'aprovado', ambiente: 'PostgreSQL PGlite local, sem chamadas externas' };
    await writeFile(path.join(pasta, 'verificacao-restauro.json'), JSON.stringify(r, null, 2), { mode: 0o600 });
    console.info(JSON.stringify(r));
}
finally {
    await db.close();
}
