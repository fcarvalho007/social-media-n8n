// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const sql = readFileSync('drizzle/migrations/0074_curadoria_ordem_publicacao.sql', 'utf8');

beforeAll(async () => {
  await db.exec(`
    CREATE FUNCTION public.nl_is_staff() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION public.mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE nl_fontes_curadoria(id uuid PRIMARY KEY, nome text, tipo text);
    CREATE TABLE nl_curadoria_ocultas_edicao(edicao_id uuid, noticia_id uuid);
    CREATE TABLE mc_fontes(id uuid, project_id uuid, metadados jsonb);
    CREATE TABLE mc_trabalhos(id uuid, fonte_id uuid, brief jsonb);
    CREATE TABLE nl_curadoria_fila(url text, publicado_em timestamptz);
    CREATE TABLE nl_noticias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text, descricao text, url text,
      categoria text, origem text, estado text, edicao_id uuid, fonte_id uuid, corpo_artigo text,
      curadoria_origem_id uuid, editorial_estado text, fonte_url_original text, created_at timestamptz);
  `);
  // "antiga" entered the Curadoria last, but was published by the source first.
  await db.exec(`
    INSERT INTO nl_curadoria_fila VALUES ('https://a.pt/antiga','2026-11-10'),('https://a.pt/recente','2026-11-25');
    INSERT INTO nl_noticias(titulo,url,categoria,origem,editorial_estado,created_at) VALUES
      ('Antiga','https://a.pt/antiga','ia','curadoria_ia','pendente','2026-11-26'),
      ('Recente','https://a.pt/recente','ia','curadoria_ia','pendente','2026-11-13'),
      ('Sem data','https://a.pt/sem','ia','curadoria_ia','pendente','2026-11-20');
  `);
  await db.exec(sql.replace(/--> statement-breakpoint/g, ''));
});

describe('Curadoria: mais recentes primeiro', () => {
  it('ordena pela data de publicação na fonte e, sem ela, pela data de entrada', async () => {
    const r = await db.query<{ r: { itens: Array<{ titulo: string; publicado_em: string | null }> } }>(
      "SELECT public.nl_curadoria_listar('pendente') AS r");
    const itens = r.rows[0].r.itens;
    expect(itens.map((i) => i.titulo)).toEqual(['Recente', 'Sem data', 'Antiga']);
    expect(itens[2].publicado_em).not.toBeNull();
  });
});
