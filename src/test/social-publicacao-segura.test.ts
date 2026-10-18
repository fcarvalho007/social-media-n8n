// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  concluirSocial,
  fingerprintSocial,
  reservarSocial,
} from "../../supabase/functions/_shared/social-seguro";
const db = new PGlite();
const u = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const rows = async (s: string, a: unknown[] = []) =>
  (await db.query<any>(s, a)).rows;
const post = async (user = u, extra: Record<string, unknown> = {}) => {
  const id = crypto.randomUUID();
  await rows(
    "INSERT INTO posts(id,user_id,external_post_ids) VALUES($1,$2,$3)",
    [id, user, JSON.stringify(extra)],
  );
  return id;
};
const sb = {
  rpc: async (name: string, args: Record<string, unknown>) => {
    try {
      const a = Object.values(args),
        params = a.map((_, i) => `$${i + 1}`).join(",");
      const data = await rows(`SELECT * FROM ${name}(${params})`, a);
      return {
        data: name === "social_publicacao_concluir"
          ? data[0].social_publicacao_concluir
          : data,
        error: null,
      };
    } catch (e) {
      return { data: null, error: e };
    }
  },
};
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid primary key);CREATE TABLE user_roles(user_id uuid,role text);
 CREATE TABLE projects(id uuid primary key,owner_id uuid);
 CREATE TABLE posts(id uuid primary key,user_id uuid,external_post_ids jsonb,workflow_id text);
 CREATE TABLE publication_attempts(id uuid,post_id uuid,platform text,status text);
 CREATE TABLE posts_drafts(id uuid primary key,user_id uuid,project_id uuid);
 CREATE TABLE instagram_analytics(id uuid primary key default gen_random_uuid(),user_id uuid,shortcode text,post_url text);
 CREATE TABLE instagram_profiles(id uuid primary key default gen_random_uuid(),user_id uuid,username text,scraped_date date,UNIQUE(username,scraped_date));
 CREATE TABLE media_library(id uuid primary key,user_id uuid);
 CREATE TABLE art_rascunhos(id uuid primary key default gen_random_uuid(),created_by uuid,project_id uuid,titulo text);
 CREATE TABLE scheduled_jobs(id uuid primary key,created_by uuid,post_id uuid);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION mc_pode_ler(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND owner_id=auth.uid())$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
 GRANT ALL ON posts,posts_drafts,instagram_analytics,instagram_profiles,media_library,art_rascunhos TO authenticated;
 ALTER TABLE posts ENABLE ROW LEVEL SECURITY;ALTER TABLE posts_drafts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE instagram_analytics ENABLE ROW LEVEL SECURITY;ALTER TABLE instagram_profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
 CREATE POLICY old_team ON posts TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY old_team ON posts_drafts TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY old_team ON instagram_analytics TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY old_team ON instagram_profiles TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY old_team ON media_library TO authenticated USING(true) WITH CHECK(true);`,
  );
  await db.exec(
    "ALTER TABLE art_rascunhos ENABLE ROW LEVEL SECURITY;CREATE POLICY old_team ON art_rascunhos TO authenticated USING(true) WITH CHECK(true)",
  );
  await rows("INSERT INTO auth.users VALUES($1),($2)", [u, other]);
  await rows("INSERT INTO user_roles VALUES($1,'admin'),($2,'editor')", [
    u,
    other,
  ]);
  await db.exec(
    readFileSync("drizzle/migrations/0064_publicacao_segura.sql", "utf8"),
  );
  await db.exec(
    readFileSync("drizzle/migrations/0065_isolamento_social.sql", "utf8"),
  );
}, 30000);
afterAll(() => db.close());
describe("reserva durável antes de efeitos externos", () => {
  it("só um de 12 pedidos simultâneos pode enviar; chaves do cliente não interferem", async () => {
    const p = await post();
    const rs = await Promise.all(
      Array.from(
        { length: 12 },
        () =>
          reservarSocial(sb, u, p, "instagram:feed", "publicar", {
            content: "mesmo",
            media: ["https://a.example/1.jpg"],
          }, {}),
      ),
    );
    expect(rs.filter((r) => !r.repetida)).toHaveLength(1);
    for (const r of rs.filter((r) => r.repetida)) {
      expect(r.repetida!.status).toBe(409);
      expect((await r.repetida!.json()).success).toBe(false);
    }
  });
  it("conserva a reserva após timeout/queda e não expira ao fim de minutos ou dias", async () => {
    const p = await post();
    const r = await reservarSocial(
      sb,
      u,
      p,
      "linkedin:feed",
      "publicar",
      "incerto",
      {},
    );
    await rows(
      "UPDATE social_publicacoes SET criado_em=now()-interval '30 days' WHERE id=$1",
      [r.id],
    );
    const again = await reservarSocial(
      sb,
      u,
      p,
      "linkedin:feed",
      "publicar",
      "conteúdo alterado",
      {},
    );
    expect(again.repetida?.status).toBe(409);
  });
  it("devolve o resultado guardado sem reenviar e impede conclusão com token falso", async () => {
    const p = await post(),
      r = await reservarSocial(
        sb,
        u,
        p,
        "facebook:feed",
        "publicar",
        "aceite",
        {},
      );
    await expect(
      concluirSocial(sb, { id: r.id, token: crypto.randomUUID() }, "aceite", {
        success: true,
      }, 200),
    ).rejects.toThrow("reconciliar");
    await concluirSocial(
      sb,
      r,
      "aceite",
      { success: true, pending: true },
      200,
    );
    const again = await reservarSocial(
      sb,
      u,
      p,
      "facebook:feed",
      "publicar",
      "aceite",
      {},
    );
    expect(await again.repetida!.json()).toMatchObject({
      success: true,
      pending: true,
      deduplicated: true,
    });
  });
  it("bloqueia conteúdo igual em posts diferentes e caracteres invisíveis", async () => {
    const a = await post(), b = await post();
    await reservarSocial(sb, u, a, "youtube:feed", "publicar", {
      caption: "Olá",
      media: ["https://a.example/a"],
    }, {});
    const r = await reservarSocial(sb, u, b, "youtube:feed", "publicar", {
      media: ["https://a.example/a"],
      caption: "Olá\u200B",
    }, {});
    expect(r.repetida?.status).toBe(409);
    expect(await fingerprintSocial({ b: 2, a: 1 })).toBe(
      await fingerprintSocial({ a: 1, b: 2 }),
    );
  });
  it("recusa autor forjado, falha de persistência e publicação histórica concluída", async () => {
    const p = await post();
    await expect(
      reservarSocial(sb, other, p, "tiktok:feed", "publicar", "x", {}),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      reservarSocial(
        { rpc: async () => ({ error: { code: "XX000" } }) },
        u,
        p,
        "tiktok:feed",
        "publicar",
        "x",
        {},
      ),
    ).rejects.toMatchObject({ status: 503 });
    const historical = await post(u, {
      instagram: "https://instagram.com/p/already",
    });
    expect(
      (await reservarSocial(
        sb,
        u,
        historical,
        "instagram:feed",
        "publicar",
        "old",
        {},
      )).repetida?.status,
    ).toBe(409);
  });
  it("uma recusa/incerteza fica registada; nunca muda para sucesso num segundo clique", async () => {
    const p = await post(),
      r = await reservarSocial(
        sb,
        u,
        p,
        "googlebusiness:feed",
        "publicar",
        "falha",
        {},
      );
    await concluirSocial(
      sb,
      r,
      "incerto",
      { success: false, fallback: false },
      409,
    );
    const again = await reservarSocial(
      sb,
      u,
      p,
      "googlebusiness:feed",
      "publicar",
      "falha",
      {},
    );
    expect(again.repetida?.status).toBe(409);
    expect(await again.repetida!.json()).toMatchObject({
      success: false,
      fallback: false,
    });
  });
});
describe("RLS efetiva contra políticas antigas de equipa", () => {
  it("isola leituras e escritas por conta/projeto; não permite trocar autoria", async () => {
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    await rows("INSERT INTO projects VALUES($1,$2),($3,$4)", [a, u, b, other]);
    const mine = await post(), theirs = await post(other);
    await rows("UPDATE posts SET project_id=$1 WHERE id=$2", [a, mine]);
    await rows(
      "INSERT INTO art_rascunhos(created_by,project_id,titulo) VALUES($1,$2,'próprio'),($3,$4,'alheio')",
      [u, a, other, b],
    );
    await rows(
      "INSERT INTO instagram_analytics(user_id,shortcode,post_url,project_id) VALUES($1,'aaa','https://i/a',$2),($3,'bbb','https://i/b',$4)",
      [u, a, other, b],
    );
    await db.exec(`SET test.uid='${u}';SET ROLE authenticated`);
    try {
      expect(await rows("SELECT id FROM posts WHERE id=$1", [theirs])).toEqual(
        [],
      );
      expect(
        (await rows("SELECT shortcode FROM instagram_analytics")).map((r) =>
          r.shortcode
        ),
      ).toEqual(["aaa"]);
      expect(await rows("SELECT titulo FROM art_rascunhos")).toEqual([{
        titulo: "próprio",
      }]);
      await expect(
        rows(
          "INSERT INTO art_rascunhos(created_by,project_id,titulo) VALUES($1,$2,'falso')",
          [u, b],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      expect(
        await rows(
          "UPDATE posts SET workflow_id='forged' WHERE id=$1 RETURNING id",
          [theirs],
        ),
      ).toEqual([]);
      await expect(
        rows("UPDATE posts SET user_id=$1 WHERE id=$2", [other, mine]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        rows("UPDATE posts SET project_id=$1 WHERE id=$2", [b, mine]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        rows(
          "SELECT * FROM social_publicacao_reservar($1,$2,'instagram:feed','publicar',$3)",
          [u, mine, "f".repeat(64)],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("deduplica importações repetidas sem apagar histórico e permite o mesmo post em projetos distintos", async () => {
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    await rows("INSERT INTO projects VALUES($1,$2),($3,$2)", [a, u, b]);
    await Promise.all(
      Array.from({ length: 8 }, () =>
        rows(
          "INSERT INTO instagram_analytics(user_id,shortcode,post_url,project_id) VALUES($1,'dup','https://i/dup',$2)",
          [u, a],
        )),
    );
    await rows(
      "INSERT INTO instagram_analytics(user_id,shortcode,post_url,project_id) VALUES($1,'dup','https://i/dup',$2)",
      [u, b],
    );
    expect(
      await rows(
        "SELECT count(*)::int n FROM instagram_analytics WHERE shortcode='dup'",
      ),
    ).toEqual([{ n: 2 }]);
  });
  it('executa o roteiro transacional de produção e remove todas as fixtures por rollback',async()=>{
    await db.exec(`ALTER TABLE projects ADD COLUMN name text;ALTER TABLE projects ADD COLUMN color text;ALTER TABLE projects ADD COLUMN icon text;
      ALTER TABLE art_rascunhos ALTER COLUMN created_by SET DEFAULT auth.uid();
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE TABLE hub_documentos(id uuid,project_id uuid,hash text,dados jsonb,pdf_path text,criado_por uuid);
      ALTER TABLE hub_documentos ENABLE ROW LEVEL SECURITY;GRANT SELECT ON hub_documentos TO authenticated;
      CREATE POLICY docs ON hub_documentos FOR SELECT TO authenticated USING(mc_pode_ler(project_id));`);
    await rows('INSERT INTO auth.users VALUES($1)',[crypto.randomUUID()]);
    await rows("UPDATE user_roles SET role='admin' WHERE user_id=$1",[other]);
    const before=(await rows('SELECT count(*)::int n FROM projects'))[0].n;
    await db.exec(readFileSync('scripts/auditar-isolamento-producao.sql','utf8'));
    expect((await rows('SELECT count(*)::int n FROM projects'))[0].n).toBe(before);
    expect(await rows("SELECT id FROM projects WHERE name LIKE 'QA rollback%'")).toEqual([]);
  });

});
