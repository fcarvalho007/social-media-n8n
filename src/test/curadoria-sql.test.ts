// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
const db = new PGlite();
const project = '00000000-0000-4000-8000-000000000001';
const news = '00000000-0000-4000-8000-000000000002';
const oldEdition = '00000000-0000-4000-8000-000000000003';
const edition = '00000000-0000-4000-8000-000000000004';
const schema = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-000000000009'::uuid $$;
CREATE FUNCTION public.nl_is_staff() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.staff',true),'true')='true' $$;
CREATE FUNCTION public.mc_pode_escrever(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.project',true),'true')='true' $$;
CREATE FUNCTION public.mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT public.mc_pode_escrever($1) $$;
-- Deterministic hash stub: testing SQL relationships/idempotence, not SHA implementation.
CREATE FUNCTION public.mc_hash(jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT md5($1::text)||md5($1::text) $$;
CREATE TABLE nl_fontes_curadoria(id uuid PRIMARY KEY,nome text,tipo text);
CREATE TABLE nl_edicoes(id uuid PRIMARY KEY,estado text);
CREATE TABLE nl_noticias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),edicao_id uuid REFERENCES nl_edicoes(id),titulo text NOT NULL,
 descricao text,url text,categoria text NOT NULL,origem text NOT NULL,estado text DEFAULT 'pendente',destino text DEFAULT 'news',
 ordem integer DEFAULT 0,fonte_id uuid,corpo_artigo text,repeticao_de uuid,created_at timestamptz DEFAULT now());
CREATE TABLE mc_fontes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,tipo text CONSTRAINT mc_fontes_tipo_check CHECK(tipo IN ('texto','link','pdf','cronica')),
 titulo text,origem_url text,texto text,metadados jsonb DEFAULT '{}',hash text,criado_por uuid,UNIQUE(project_id,hash));
CREATE TABLE mc_trabalhos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,fonte_id uuid REFERENCES mc_fontes(id),brief jsonb,
 prompt_versao text,modelo text,parametros jsonb,cache_chave text CONSTRAINT mc_trabalhos_cache_chave_key UNIQUE,explicito boolean,criado_por uuid);
CREATE TABLE mc_propostas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,trabalho_id uuid REFERENCES mc_trabalhos(id));
CREATE TABLE mc_etapas(trabalho_id uuid,etapa text,estado text);
CREATE TABLE mc_export_trabalhos(id uuid PRIMARY KEY,documento_id uuid,documento_versao integer,lease_token uuid,lease_ate timestamptz,estado text,paginas integer,
 manifesto jsonb,erro text,erro_classe text,concluido_em timestamptz,actualizado_em timestamptz);
ALTER TABLE mc_propostas ADD COLUMN versao_actual integer DEFAULT 1, ADD COLUMN aprovada_versao integer, ADD COLUMN aprovada_por uuid, ADD COLUMN aprovada_em timestamptz, ADD COLUMN actualizado_em timestamptz;
CREATE TABLE mc_documentos(id uuid PRIMARY KEY,project_id uuid,proposta_id uuid REFERENCES mc_propostas(id),versao_actual integer,aprovada_versao integer,aprovada_por uuid,aprovada_em timestamptz,actualizado_em timestamptz);
CREATE TABLE mc_documentos_versoes(documento_id uuid,versao integer,documento jsonb,proposta_versao integer);
CREATE TABLE mc_ligacoes_sociais(project_id uuid,documento_id uuid,documento_versao integer,destino text,draft_previsto uuid,draft_id uuid,proposta_versao integer,criado_por uuid,UNIQUE(documento_id,documento_versao,destino));
CREATE TABLE mc_exportacoes(documento_id uuid,documento_versao integer,formato text,pagina integer);
`;
async function rows<T = Record<string, unknown>>(sql: string, args: unknown[] = []) { return (await db.query<T>(sql, args)).rows; }
beforeAll(async () => {
  await db.exec(schema);
  await db.query('INSERT INTO nl_edicoes VALUES($1,\'enviada\'),($2,\'rascunho\')', [oldEdition, edition]);
  await db.query('INSERT INTO nl_noticias(id,edicao_id,titulo,descricao,categoria,origem,estado) VALUES($1,$2,\'Notícia de teste\',\'Resumo factual suficientemente longo para a criação de um conteúdo.\',\'ia\',\'rss\',\'enviada\')', [news, oldEdition]);
  await db.exec(readFileSync('drizzle/migrations/0039_curadoria_unica_formatos.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0040_curadoria_proveniencia.sql', 'utf8'));
}, 30000);
afterAll(async () => db.close());
const snapshot = async () => (await rows<{ s: { hash: string; texto: string; nivel: string; parcial: boolean } }>('SELECT nl_curadoria_snapshot($1) AS s', [news]))[0].s;
const create = async (hash: string, formato = 'carrossel') => (await rows<{ trabalho_id: string; fonte_id: string; reutilizado: boolean }>('SELECT * FROM mc_criar_trabalho_curadoria($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb)', [project, news, hash, JSON.stringify({ formato, slides: formato === 'carrossel' ? 3 : 1 }), 'local-v1', 'estruturacao-local', JSON.stringify({ formato })]))[0];

describe('curadoria única: migração PostgreSQL isolada', () => {
  it('preserva a notícia enviada e separa escolha editorial da edição', async () => {
    expect((await snapshot()).nivel).toBe('resumo');
    await db.query("UPDATE nl_noticias SET estado='pendente' WHERE id=$1", [news]);
    expect((await rows('SELECT editorial_estado,edicao_id FROM nl_noticias WHERE id=$1', [news]))[0]).toMatchObject({ editorial_estado: 'aprovada', edicao_id: oldEdition });
    await db.query("UPDATE nl_noticias SET estado='enviada' WHERE id=$1", [news]);
  });
  it('congela a fonte; retries reutilizam e formatos distintos criam trabalhos diferentes', async () => {
    const s = await snapshot(); const a = await create(s.hash); const retry = await create(s.hash); const post = await create(s.hash, 'post'); const story = await create(s.hash, 'story');
    expect(a.reutilizado).toBe(false); expect(retry.reutilizado).toBe(true); expect(a.trabalho_id).toBe(retry.trabalho_id);
    expect(new Set([a.trabalho_id, post.trabalho_id, story.trabalho_id]).size).toBe(3);
    expect(a.fonte_id).toBe(story.fonte_id);
    await db.query("UPDATE nl_noticias SET descricao='Descrição revista com informação adicional que não muda a fonte congelada.' WHERE id=$1", [news]);
    await expect(create(s.hash)).rejects.toMatchObject({ code: 'MC409' });
    const frozen = (await rows<{ texto: string }>('SELECT texto FROM mc_fontes WHERE id=$1', [a.fonte_id]))[0].texto;
    expect(frozen).toBe(s.texto);
    const derivado = (await rows<{ fonte_id: string }>('SELECT * FROM mc_criar_trabalho_derivado($1,$2::jsonb,\'regen-v1\',\'estruturacao-local\',\'{}\')', [a.trabalho_id, JSON.stringify({ formato: 'carrossel', regen: 's1' })]))[0];
    expect(derivado.fonte_id).toBe(a.fonte_id);
  });
  it('não move notícias antigas ao reutilizar na newsletter; mesma seleção não duplica', async () => {
    const a = (await rows<{ id: string }>('SELECT nl_curadoria_para_edicao($1,$2) AS id', [news, edition]))[0];
    const b = (await rows<{ id: string }>('SELECT nl_curadoria_para_edicao($1,$2) AS id', [news, edition]))[0];
    expect(a.id).toBe(b.id); expect(a.id).not.toBe(news);
    expect((await rows('SELECT estado,edicao_id FROM nl_noticias WHERE id=$1', [news]))[0]).toEqual({ estado: 'enviada', edicao_id: oldEdition });
    const list = (await rows<{ r: { total: number; itens: Array<{ edicoes: string[] }> } }>("SELECT nl_curadoria_listar('aprovada') AS r"))[0].r;
    expect(list.total).toBe(1); expect(list.itens[0].edicoes).toContain(edition);
    await expect(rows('SELECT nl_curadoria_para_edicao($1,$2)', [news, oldEdition])).rejects.toMatchObject({ code: 'MC409' });
  });
  it('rejeitadas/pendentes não são fontes novas e chamadas sem acesso falham', async () => {
    await db.query("SELECT nl_curadoria_decidir($1,'rejeitada')", [news]);
    await expect(snapshot()).rejects.toMatchObject({ code: 'MC409' });
    await db.query("SELECT nl_curadoria_decidir($1,'aprovada')", [news]);
    await db.exec("SET test.staff='false'");
    await expect(snapshot()).rejects.toMatchObject({ code: '42501' });
    await expect(rows("SELECT nl_curadoria_decidir($1,'aprovada')", [news])).rejects.toMatchObject({ code: '42501' });
    await db.exec("SET test.staff='true'; SET test.project='false'");
    await expect(create((await snapshot()).hash)).rejects.toMatchObject({ code: '42501' });
    await db.exec("SET test.project='true'; SET ROLE anon");
    await expect(rows("SELECT nl_curadoria_listar() ")).rejects.toMatchObject({ code: '42501' });
    await db.exec('RESET ROLE');
  });
  it('valida dimensões e número de páginas no banco; suporta documentos antigos', async () => {
    const check = (d: unknown) => rows('SELECT mc_validar_documento($1::jsonb)', [JSON.stringify(d)]);
    await check({ v: 1, variante: 'A', largura: 1080, altura: 1350, paginas: [{}] });
    await check({ v: 1, variante: 'A', formato: 'story', largura: 1080, altura: 1920, paginas: [{}] });
    await expect(check({ v: 1, variante: 'A', formato: 'story', largura: 1080, altura: 1350, paginas: [{}] })).rejects.toMatchObject({ code: '22023' });
    await expect(check({ v: 1, variante: 'A', formato: 'post', largura: 1080, altura: 1350, paginas: [{}, {}] })).rejects.toMatchObject({ code: '22023' });
  });
  it('exportação estática precisa de PNG, dimensões corretas e lease válida; entrega social é idempotente', async () => {
    const doc='00000000-0000-4000-8000-000000000010', job='00000000-0000-4000-8000-000000000011', lease='00000000-0000-4000-8000-000000000012';
    const work=await create((await snapshot()).hash,'story');
    const prop=(await rows<{id:string}>('SELECT id FROM mc_propostas WHERE trabalho_id=$1',[work.trabalho_id]))[0].id;
    await db.query('INSERT INTO mc_documentos VALUES($1,$2,$3,1,NULL,NULL,NULL,NULL)',[doc,project,prop]);
    await db.query('INSERT INTO mc_documentos_versoes VALUES($1,1,$2::jsonb,1)',[doc,JSON.stringify({v:1,variante:'A',formato:'story',largura:1080,altura:1920,paginas:[{}]})]);
    await db.query("INSERT INTO mc_export_trabalhos(id,documento_id,documento_versao,lease_token,lease_ate,estado,paginas) VALUES($1,$2,1,$3,now()+interval '1 minute','a_processar',1)",[job,doc,lease]);
    const finish=(width=1080,height=1920,l=lease)=>rows<{ok:boolean}>('SELECT mc_concluir_exportacao($1,$2,$3::jsonb) AS ok',[job,l,JSON.stringify({largura:width,altura:height})]);
    await expect(finish()).rejects.toMatchObject({code:'22023'});
    await db.query("INSERT INTO mc_exportacoes VALUES($1,1,'png',0)",[doc]);
    await expect(finish(1080,1350)).rejects.toMatchObject({code:'22023'});
    expect((await finish(1080,1920,doc))[0].ok).toBe(false);
    expect((await finish())[0].ok).toBe(true);expect((await finish())[0].ok).toBe(false);
    const prep=()=>rows<{draft_previsto:string;draft_id:null}>('SELECT * FROM mc_preparar_social($1,1,1)',[doc]);
    const a=(await prep())[0],b=(await prep())[0];expect(a.draft_previsto).toBe(b.draft_previsto);expect(a.draft_id).toBeNull();
    expect(await rows('SELECT destino FROM mc_ligacoes_sociais WHERE documento_id=$1',[doc])).toEqual([{destino:'instagram'}]);
    await expect(rows('SELECT mc_preparar_social($1,2,1)',[doc])).rejects.toMatchObject({code:'MC409'});
    await db.exec("SET test.project='false'");await expect(prep()).rejects.toMatchObject({code:'42501'});await db.exec("SET test.project='true'");
  });
  it('null e variante desconhecida não são documentos válidos',async()=>{
    await expect(rows('SELECT mc_validar_documento(NULL)')).rejects.toMatchObject({code:'22023'});
    await expect(rows(`SELECT mc_validar_documento('{"v":1,"variante":"X","largura":1080,"altura":1350,"paginas":[{}]}')`)).rejects.toMatchObject({code:'22023'});
  });

});

it('devolve a fonte registada sem inferir pelo domínio e preserva notícias sem fonte', async () => {
 const fid='00000000-0000-4000-8000-000000000080';
 await db.query("INSERT INTO nl_fontes_curadoria VALUES($1,'Publicação de teste','newsletter')",[fid]);
 await db.query("UPDATE nl_noticias SET fonte_id=$1,editorial_estado='aprovada' WHERE id=$2",[fid,news]);
 const result=await rows<{r:{itens:Array<{id:string,fonte_nome:string,fonte_tipo:string}>}}>("SELECT nl_curadoria_listar() r");
 expect(result[0].r.itens.find(n=>n.id===news)).toMatchObject({fonte_nome:'Publicação de teste',fonte_tipo:'newsletter'});
 await db.query('UPDATE nl_noticias SET fonte_id=NULL WHERE id=$1',[news]);
 const fallback=await rows<{r:{itens:Array<{id:string,fonte_nome:string|null}>}}>('SELECT nl_curadoria_listar() r');
 expect(fallback[0].r.itens.find(n=>n.id===news)?.fonte_nome).toBeNull();
});
