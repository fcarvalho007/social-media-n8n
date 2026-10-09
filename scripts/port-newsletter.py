#!/usr/bin/env python3
"""Ports the original newsletter app (migration-reference, inert .txt) into this project.

Client: src/newsletter/** (features, routes, client lib). Server functions become RPC stubs.
Server: supabase/functions/_shared/nl-app/** (real *.functions.ts + *.server.ts), executed by nl-api.
Re-runnable: wipes generated output first. Origin source is never modified.
"""
import sys
import subprocess, os, re, shutil, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "migration-reference/code/newsletter/src")
CLI = os.path.join(ROOT, "src/newsletter")
SRV = os.path.join(ROOT, "supabase/functions/_shared/nl-app")

TABLES = ("audit_log brief_edicoes brief_versoes brief_eventos briefs configuracoes cronicas curadoria_config "
          "curadoria_ferramentas_config curadoria_fila definicoes_ia edicoes egoi_campanhas egoi_listas emails_recebidos "
          "episodios_podcast ferramentas_excluidas ferramentas_semana ferramentas_sugeridas fontes_curadoria ia_uso noticias "
          "perfis prioridades_editoriais revista_edicao revista_itens secoes_edicao subscricao_eventos").split()
RPCS = ("criar_seccoes_padrao encontrar_candidatos_repeticao mover_seccao reordenar_noticias reordenar_seccoes "
        "stats_fontes_30d contar_dados_antigos limpar_dados_antigos me_papel is_admin is_staff registar_evento_brief pesquisar_arquivo pesquisar_global").split()
SKIP_LIB = ("auth-email.", "error-capture", "error-page", "lovable-error-reporting")

def tables(s: str) -> str:
    s = re.sub(r'\.from\((["\'])(%s)\1\)' % "|".join(TABLES), lambda m: '.from("nl_%s")' % m.group(2), s)
    s = re.sub(r'\.rpc\((["\'])(%s)\1' % "|".join(RPCS), lambda m: '.rpc("nl_%s"' % m.group(2), s)
    s = re.sub(r'(\(fn: )"(%s)"\)' % "|".join(RPCS), lambda m: '%s"nl_%s")' % (m.group(1), m.group(2)), s)
    s = re.sub(r'(postgres_changes"?,\s*\{[^}]*table:\s*["\'])(%s)(["\'])' % "|".join(TABLES), lambda m: m.group(1) + "nl_" + m.group(2) + m.group(3), s)
    s = re.sub(r'((?:foreignTable|referencedTable):\s*["\'])(%s)(["\'])' % "|".join(TABLES), lambda m: m.group(1) + "nl_" + m.group(2) + m.group(3), s)
    s = re.sub(r'(\.(?:eq|neq|in|is|gt|gte|lt|lte|not|like|ilike|filter|contains)\(\s*["\'])(%s)\.' % "|".join(TABLES), lambda m: m.group(1) + "nl_" + m.group(2) + ".", s)
    # PostgREST orders embedded rows by the alias, not the table name (alias "edicao" in the archive query)
    s = s.replace('.order("enviada_em", { foreignTable: "nl_edicoes",', '.order("enviada_em", { referencedTable: "edicao",')
    # embedded resources inside .select("...") strings: alias:table(...) / table!hint(...)
    # Keep the original JSON key: "edicoes(numero)" -> "edicoes:nl_edicoes(numero)", "alias:edicoes(" -> "alias:nl_edicoes(".
    emb_alias = re.compile(r'(?<=:)\s*(%s)(?=\s*[(!])' % "|".join(TABLES))
    emb_bare = re.compile(r'(?<![\w.:])(%s)(?=\s*[(!])' % "|".join(TABLES))
    def emb(sel):
        sel = emb_alias.sub(lambda x: "nl_" + x.group(1), sel)
        return emb_bare.sub(lambda x: "%s:nl_%s" % (x.group(1), x.group(1)), sel)
    s = re.sub(r'(\.select\(\s*)(["`\'])([\s\S]*?)\2', lambda m: m.group(1) + m.group(2) + emb(m.group(3)) + m.group(2), s)
    return s

def read(p):
    return open(p, encoding="utf-8").read()

def write(p, s):
    # Atomic and change-only: the dev server must never observe a missing or half-written module.
    os.makedirs(os.path.dirname(p), exist_ok=True)
    WRITTEN.add(os.path.abspath(p))
    if os.path.isfile(p) and open(p, encoding="utf-8").read() == s:
        return
    tmp = p + ".tmp-port"
    open(tmp, "w", encoding="utf-8").write(s)
    os.replace(tmp, p)

WRITTEN = set()

def walk(base):
    for d, _, fs in os.walk(base):
        if "__tests__" in d or "/perf" in d:
            continue
        for f in fs:
            if f.endswith(".txt") and not re.search(r"\.test\.tsx?\.txt$", f):
                yield os.path.join(d, f)

def server_fn_exports(s):
    return re.findall(r"export const (\w+)\s*=\s*createServerFn\(", s)

# ---------------- client ----------------
# Targeted type fixes for origin code that relied on strict-mode narrowing or older lucide-react
# prop types. Each pattern must exist (the port fails loudly otherwise) so drift is never hidden.
CLIENT_FIXES = {
    # The origin's relative /api route does not exist here; the staff-session sync lives in nl-hooks.
    "features/newsletter/partilhado/modais/Fontes.tsx": [
        ('  onFechar: () => void;', '  onFechar: () => void;\n  embutido?: boolean;'),
        ('notify, onFechar }: FontesProps)', 'notify, onFechar, embutido = false }: FontesProps)'),
        ('        return (\n        <ModalBase onClose={() => onFechar()} titulo="" wide chromeless>', '        const conteudo = ('),
        ('        </ModalBase>\n        );', '        );\n        return embutido ? conteudo : <ModalBase onClose={onFechar} titulo="" wide chromeless>{conteudo}</ModalBase>;'),
        ('<button onClick={() => onFechar()} className="p-2 rounded-lg hover:bg-black/5 shrink-0" aria-label="Fechar">', '{!embutido && <button onClick={() => onFechar()} className="p-2 rounded-lg hover:bg-black/5 shrink-0" aria-label="Fechar">'),
        ('<X size={18} style={{ color: T.muted }} />\n              </button>', '<X size={18} style={{ color: T.muted }} />\n              </button>}'),
        ('value={fonteMax ?? 15}', 'aria-label="Máximo por corrida" value={fonteMax ?? 15}'),
        ('type="number" min={c.min}', 'aria-label={c.rotulo} type="number" min={c.min}'),
        ('        const conteudo = (', '        if (fontesQ.isLoading || curadoriaConfigQ.isLoading) return <p role="status" className="p-6">A carregar fontes e limites…</p>;\n        if (fontesQ.isError || curadoriaConfigQ.isError) return <div role="alert" className="p-6 space-y-3"><p>Não foi possível carregar as fontes e os limites. As configurações existentes foram preservadas.</p><button className="underline" onClick={() => { void fontesQ.refetch(); void curadoriaConfigQ.refetch(); }}>Tentar novamente</button><button className="ml-4 underline" onClick={onFechar}>Voltar</button></div>;\n        const conteudo = ('),
        ('useState<"todas" | "rss" | "html" | "newsletter">', 'useState<"todas" | "rss" | "html" | "newsletter" | "directorio_ferramentas">'),
        ('newsletter: fontes.filter((x) => (x as { tipo?: string }).tipo === "newsletter").length,', 'newsletter: fontes.filter((x) => (x as { tipo?: string }).tipo === "newsletter").length,\n                    directorios: fontes.filter((x) => (x as { tipo?: string }).tipo === "directorio_ferramentas").length,'),
        ('{ id: "newsletter", rotulo: "Newsletter", n: cont.newsletter },', '{ id: "newsletter", rotulo: "Newsletter", n: cont.newsletter },\n                    { id: "directorio_ferramentas", rotulo: "Diretórios", n: cont.directorios },'),
        ('if (t === "html") return (', 'if (t === "directorio_ferramentas") return <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: T.shell, color: T.muted }}>Diretório</span>;\n                                if (t === "html") return ('),
        ('Recolha diária', 'Recolha de fontes'),
        ('                    <span aria-hidden style={{ color: T.faint }}>·</span>\n                    <span>Próxima <strong style={{ color: T.ink }}>{proximaTxt}</strong></span>', ''),
        ('flex items-center gap-3 flex-1 min-w-[240px]', 'flex flex-col items-stretch gap-3 flex-1 min-w-0 sm:min-w-[240px] sm:flex-row sm:items-center'),
        ('flex items-center gap-2 ml-auto', 'flex items-center gap-2 sm:ml-auto'),
        ('flex items-center justify-between gap-4 flex-wrap', 'flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center sm:flex-wrap'),
    ],
    "features/newsletter/revista/EditorRevista.tsx": [
        ('estadoBriefsDaEdicaoFn, sincronizarBriefPapelFn, sincronizarBriefsDaEdicaoFn', 'estadoBriefsDaEdicaoFn, sincronizarBriefPapelFn'),
        ('''  // Edições escolhidas antes desta fase ainda não têm Brief: reconcilia uma vez.
  const reconciliarBriefs = useServerFn(sincronizarBriefsDaEdicaoFn);
  const reconciliado = useRef<string | null>(null);
  useEffect(() => {
    if (!edicaoId || briefsQ.isPending || reconciliado.current === edicaoId) return;
    reconciliado.current = edicaoId;
    void reconciliarBriefs({ data: { edicaoId } })
      .then((r) => { if (r.sincronizados > 0) recarregarBriefs(); })
      .catch(() => { /* reconciliação é oportunista */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, briefsQ.isPending]);''', '  // Opening an edition is read-only; never synchronize Briefs on mount.'),
        ('import { FitaFases,', 'import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";\nimport { FitaFases,'),
        ('{fase === "curar" && (\n        <>', '{fase === "curar" && (\n        <>\n          <details className="rounded-2xl border border-border bg-card p-4" open>\n            <summary className="min-h-11 cursor-pointer font-semibold">Notícias aprovadas na curadoria comum</summary>\n            <CuradoriaNoticias paraEdicao={{ id: edicaoId, onSelecionada: () => { void qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["pendentes"] }); } }} />\n          </details>'),
    ],
    "features/newsletter/EditorNewsletter.tsx": [
        ('import { Pendentes }', 'import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";\nimport { Pendentes }'),
        ('          <div className="mb-4"><FilaEntrada /></div>', '          <div className="mb-4"><FilaEntrada /></div>\n          {edicaoId && !bloqueado && <details className="mb-4 rounded-2xl border border-border bg-card p-4">\n            <summary className="min-h-11 cursor-pointer font-semibold">Notícias aprovadas na curadoria comum</summary>\n            <CuradoriaNoticias paraEdicao={{ id: edicaoId, onSelecionada: () => { void qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["pendentes"] }); } }} />\n          </details>}'),
    ],
    "features/newsletter/data.ts": [
        ('''  const { data: sess } = await supabase.auth.getSession();
  const apikey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
  const res = await fetch("/api/public/hooks/sincronizar-podcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey,
      Authorization: `Bearer ${sess.session?.access_token ?? apikey}`,
    },
    body: "{}",
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; novos?: number; total_feed?: number; mensagem?: string };
  if (!res.ok || json.ok === false) {
    throw new Error(json.mensagem ?? `Erro ${res.status}`);
  }''', '''  const { data, error } = await supabase.functions.invoke("nl-hooks/podcast-sincronizar", { body: {} });
  let json = (data ?? {}) as { ok?: boolean; novos?: number; total_feed?: number; mensagem?: string };
  if (error) {
    const ctx = (error as { context?: Response }).context;
    json = ((ctx ? await ctx.json().catch(() => null) : null) ?? {}) as typeof json;
    throw new Error(ctx?.status === 401 ? "A sessão expirou. Volta a entrar." : json.mensagem ?? error.message);
  }
  if (json.ok === false) throw new Error(json.mensagem ?? "Não foi possível atualizar o podcast");'''),
        ('export async function listarPendentes(): Promise<Pendente[]> {\n  const { data, error } = await supabase', 'export async function listarPendentes(): Promise<Pendente[]> {\n  // New columns are added by migration 0039; the Cloud catalog is regenerated on deployment.\n  const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;\n  const { data, error } = await db'),
        ('.eq("estado", "pendente")\n    .order("created_at",', '.eq("estado", "pendente")\n    .filter("editorial_estado", "eq", "pendente")\n    .filter("curadoria_origem_id", "is", null)\n    .order("created_at",'),
    ],
    "features/newsletter/AssuntoField.tsx": [
        ("type Validacao = { ok: true } | { ok: false; erro: string };", "type Validacao = { ok: boolean; erro?: string };"),
    ],
    "routes/_authenticated/ferramentas.tsx": [
        ('setFeedback({ tipo: "erro", msg: r.motivo });', 'setFeedback({ tipo: "erro", msg: "motivo" in r ? r.motivo : "" });'),
    ],
    "features/newsletter/partilhado/useEnvioNewsletter.ts": [
        ("opcoes?.publicarConteudos === true", "(opcoes || undefined)?.publicarConteudos === true"),
    ],
}
LUCIDE_OLD = "ComponentType<{ size?: number; color?: string }>"
LUCIDE_NEW = "ComponentType<{ size?: number | string; color?: string }>"

def apply_client_fixes(rel, body):
    body = body.replace(LUCIDE_OLD, LUCIDE_NEW)
    for old, new in CLIENT_FIXES.get(rel, []):
        if old not in body:
            raise SystemExit("port-newsletter: fix pattern not found in %s: %s" % (rel, old))
        body = body.replace(old, new)
    return body

TIPOS = "@/newsletter/_tipos-servidor"  # declarations emitted from the server tree by tsc

def server_type_spec(rel, spec):
    """Maps an origin `*.server` type import to the declaration emitted from the ported server code."""
    if spec.startswith("@/"):
        o = spec[2:]
    else:
        o = os.path.normpath(os.path.join(os.path.dirname(rel or "lib/x"), spec)).replace(os.sep, "/")
    if o.startswith("lib/newsletter-engine/"):
        return TIPOS + "/newsletter-engine/" + o[len("lib/newsletter-engine/"):]
    if o.startswith("lib/auth-email"):
        raise SystemExit("port-newsletter: auth-email is not ported (%s)" % rel)
    return TIPOS + "/nl-app/" + o

def typed_stubs(body, mod):
    return re.sub(r'nlServerFn\("%s:(\w+)"\)' % re.escape(mod),
                  lambda m: 'nlServerFn<typeof import("%s/nl-app/lib/%s.functions").%s>("%s:%s")' % (TIPOS, mod, m.group(1), mod, m.group(1)), body)

def client_alias(s: str, rel: str = "") -> str:
    s = s.replace('"@tanstack/react-router"', '"@/newsletter/shim/router"')
    s = s.replace('"@tanstack/react-start"', '"@/newsletter/shim/start"')
    s = s.replace('"@tanstack/zod-adapter"', '"@/newsletter/shim/zod-adapter"')
    s = re.sub(r'\["(Tables|Views)"\]\["(\w+)"\]', lambda m: '["%s"]["%s"]' % (m.group(1), ("nl_" + m.group(2)) if m.group(2) in TABLES else m.group(2)), s)
    s = re.sub(r'import type \{([^}]*)\} from "([^"]*\.server)";', lambda m: 'import type {%s} from "%s";' % (m.group(1), server_type_spec(rel, m.group(2))), s)
    s = re.sub(r'"(?:\.\./)+supabase/functions/_shared/', '"@/newsletter/edge-shared/', s)
    s = re.sub(r'"@/features/', '"@/newsletter/features/', s)
    s = re.sub(r'"@/lib/(?!utils")', '"@/newsletter/lib/', s)
    s = re.sub(r'"@/hooks/use-mobile"', '"@/hooks/use-mobile"', s)
    s = re.sub(r'"@/routes/', '"@/newsletter/routes/', s)
    return tables(s)

def build_client():
    # No rmtree here: stale client files are removed only after the new ones exist (see prune_stale_client).
    global CLIENT_ANTES
    CLIENT_ANTES = [os.path.abspath(f) for d in ("features", "lib", "routes") for f in walk_all(os.path.join(CLI, d))]
    for f in walk(os.path.join(SRC, "features")):
        rel = os.path.relpath(f, SRC)[:-4]
        body = client_alias(read(f), rel)
        write(os.path.join(CLI, rel), apply_client_fixes(rel.replace(os.sep, "/"), body))
    for f in walk(os.path.join(SRC, "lib")):
        rel = os.path.relpath(f, SRC)[:-4]
        name = os.path.basename(rel)
        if name.startswith(SKIP_LIB) or ".server." in name:
            continue
        s = read(f)
        if ".functions." in name:
            mod = name.split(".functions.")[0]
            exps = server_fn_exports(s)
            body = subprocess.run(["node", os.path.join(ROOT, "scripts/nl-stub.cjs"), mod], input=s, capture_output=True, text=True, check=True).stdout
            body = typed_stubs(client_alias(body, rel), mod)
            out = ["// GENERATED by scripts/port-newsletter.py — RPC stubs; real handlers run in nl-api.",
                   'import { nlServerFn } from "@/newsletter/shim/start";', body]
            write(os.path.join(CLI, rel), "\n".join(out) + "\n")
        else:
            write(os.path.join(CLI, rel), client_alias(s, rel))
    os.makedirs(os.path.join(CLI, "edge-shared"), exist_ok=True)
    for name in ("design-tokens", "ia-limpeza"):
        write(os.path.join(CLI, "edge-shared", name + ".ts"), read(os.path.join(ROOT, "migration-reference/code/newsletter/supabase/functions/_shared", name + ".ts.txt")))
    for f in walk(os.path.join(SRC, "routes/_authenticated")):
        rel = os.path.relpath(f, SRC)[:-4]
        body = client_alias(read(f), rel)
        write(os.path.join(CLI, rel), apply_client_fixes(rel.replace(os.sep, "/"), body))


def top_level_statements(s):
    """Split source into top-level statements (brace/paren/string aware, rough)."""
    out, start, depth, i, n = [], 0, 0, 0, len(s)
    while i < n:
        c = s[i]
        if c in "\"'`":
            q = c; i += 1
            while i < n and s[i] != q:
                if s[i] == "\\": i += 1
                i += 1
        elif s.startswith("//", i):
            j = s.find("\n", i); i = n if j < 0 else j
            continue
        elif s.startswith("/*", i):
            j = s.find("*/", i); i = n if j < 0 else j + 2
            continue
        elif c in "{([": depth += 1
        elif c in "})]": depth -= 1
        elif depth == 0 and (c == ";" or (c == "\n" and s[start:i].strip().endswith("}") and not re.match(r"\s*[.)]", s[i+1:i+40]) )):
            out.append(s[start:i+1]); start = i + 1
        i += 1
    if s[start:].strip(): out.append(s[start:])
    return out

def stub_functions_source(s, mod, exps):
    kept, removed_names = [], set()
    for st in top_level_statements(s):
        m = re.match(r"\s*(?:/\*[\s\S]*?\*/\s*|//[^\n]*\n\s*)*export const (\w+)\s*=\s*createServerFn", st)
        if m:
            kept.append('\nexport const %s = nlServerFn("%s:%s");' % (m.group(1), mod, m.group(1)))
            continue
        if re.match(r"\s*(?:/\*[\s\S]*?\*/\s*|//[^\n]*\n\s*)*(?:async )?function |\s*(?:/\*[\s\S]*?\*/\s*|//[^\n]*\n\s*)*const \w+\s*=\s*(?:async\s*)?\(", st) and "export" not in st.split("(")[0]:
            continue  # private server helpers
        kept.append(st)
    src = "".join(kept)
    # drop imports that are server-only or no longer referenced
    final = []
    for st in top_level_statements(src):
        im = re.match(r"\s*import\s+(type\s+)?([\s\S]*?)\s+from\s+\"([^\"]+)\";?", st)
        if im:
            spec = im.group(3)
            if "react-start" in spec or ".server" in spec or "auth-middleware" in spec or "integrations/supabase/client" in spec:
                continue
            rest = src.replace(st, "")
            names = re.findall(r"(?:\b(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?)", im.group(2).replace("{"," ").replace("}"," ").replace(","," "))
            used = [ (a or b) for b, a in names if (a or b) not in ("type","as") and re.search(r"\b%s\b" % (a or b), rest)]
            if not used:
                continue
            final.append("\nimport type " + "{ " + ", ".join(sorted(set(used))) + " } from \"" + spec + "\";" if im.group(1) or not re.search(r"[{]", im.group(2)) is None and False else st)
            continue
        final.append(st)
    return "".join(final)

# ---------------- server ----------------
def server_rewrite(s: str, here: str) -> str:
    def rel_to(target):
        r = os.path.relpath(target, os.path.dirname(here))
        return r if r.startswith(".") else "./" + r
    s = s.replace('"@tanstack/react-start"', '"%s"' % rel_to(os.path.join(SRV, "_shim/start.ts")))
    s = s.replace('"@tanstack/react-start/server"', '"%s"' % rel_to(os.path.join(SRV, "_shim/start.ts")))
    s = s.replace('"@/integrations/supabase/auth-middleware"', '"%s"' % rel_to(os.path.join(SRV, "_shim/auth.ts")))
    s = s.replace('"@/integrations/supabase/client.server"', '"%s"' % rel_to(os.path.join(SRV, "_shim/admin.ts")))
    s = re.sub(r'"(?:@/lib/|\./)newsletter-engine/', '"%s/' % rel_to(os.path.join(ROOT, "supabase/functions/_shared/newsletter-engine")), s)
    s = re.sub(r'"@/lib/', '"%s/' % rel_to(os.path.join(SRV, "lib")), s)
    s = re.sub(r'"@/features/', '"%s/' % rel_to(os.path.join(SRV, "features")), s)
    s = re.sub(r'"(\.\./)+supabase/functions/_shared/', '"%s/' % rel_to(os.path.join(SRV, "edge-shared")), s)
    s = s.replace('"@tanstack/react-router"', '"%s"' % rel_to(os.path.join(SRV, "_shim/router.ts")))
    s = re.sub(r'"@/routes/api/public/hooks/', '"%s/' % rel_to(os.path.join(SRV, "hooks")), s)
    s = s.replace('"@/integrations/supabase/types"', '"%s"' % rel_to(os.path.join(SRV, "_shim/types.ts")))
    s = s.replace('"zod"', '"npm:zod@3.25.76"')
    s = s.replace('"@supabase/supabase-js"', '"npm:@supabase/supabase-js@2.57.4"').replace("'@supabase/supabase-js'", '"npm:@supabase/supabase-js@2.57.4"')
    s = re.sub(r'from "crypto"', 'from "node:crypto"', s)
    s = tables(s)
    s = s.replace("process.env.WORDPRESS_APP_USER", "(process.env.WORDPRESS_APP_USER || process.env.wordpress_site_username)")
    s = s.replace("process.env.WORDPRESS_APP_PASSWORD", "(process.env.WORDPRESS_APP_PASSWORD || process.env.wordpress_site_key)")
    def addts(m):
        p = m.group(2)
        if re.search(r"\.(ts|tsx|json)$", p):
            return m.group(0)
        base = os.path.normpath(os.path.join(os.path.dirname(here), p))
        if os.path.isdir(base):
            return '%s"%s/index.ts"' % (m.group(1), p)
        return '%s"%s.ts"' % (m.group(1), p)
    s = re.sub(r'((?:from|import)\s*\(?\s*)"(\.{1,2}/[^"]+)"', addts, s)
    if re.search(r"\bBuffer\.", s) and "node:buffer" not in s:
        s = 'import { Buffer } from "node:buffer";\n' + s
    if "process.env" in s and "node:process" not in s:
        s = 'import process from "node:process";\n' + s
    return s

# Origin hooks ported as handlers. They are reachable only through the nl-hooks edge function, which
# authenticates first (cron secret / service role, BasicAuth, webhook key). "unsubscribe" is rewritten in nl-publico.
HOOKS_INTERNOS = ("curadoria-ferramentas", "curadoria-rss", "email-newsletter", "enviar-agendados",
                  "sincronizar-podcast", "reprocessar-emails", "egoi-subscricao", "retomar-subscricoes")

# Targeted server fixes so the strict type-check (and declaration emit) passes. Patterns must exist.
SERVER_FIXES = {
    # The origin called its own public hook over HTTP; here the hook runs in-process (that URL does not exist).
    "lib/curadoria.functions.ts": [
        ('  const appUrl = await urlAppFromRequest();\n  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";\n  if (!anon) throw new Error("Chave pública não configurada");\n  const inicio = Date.now();\n  const res = await fetch(`${appUrl}/api/public/hooks/curadoria-rss`, {\n    method: "POST",\n    headers: { "Content-Type": "application/json", apikey: anon },\n    body: JSON.stringify(forcarFontes ? { forcar_fontes: forcarFontes } : {}),\n  });',
         '  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";\n  if (!anon) throw new Error("Chave pública não configurada");\n  const inicio = Date.now();\n  const { supabaseAdmin: adm } = await import(\"../_shim/admin.ts\");\n  const contarFila = async () => (await adm.from(\"nl_curadoria_fila\").select(\"id\", { count: \"exact\", head: true }).eq(\"estado\", \"em_fila\")).count ?? 0;\n  const antes = await contarFila();\n  const { Route } = await import("../hooks/curadoria-rss.ts") as unknown as { Route: { options: { server: { handlers: { POST: (c: { request: Request }) => Promise<Response> } } } } };\n  const res = await Route.options.server.handlers.POST({ request: new Request("http://interno/curadoria-rss", {\n    method: "POST",\n    headers: { "Content-Type": "application/json", apikey: anon },\n    body: JSON.stringify(forcarFontes ? { forcar_fontes: forcarFontes } : {}),\n  }) });'),
        ('    inseridas: body.inseridas ?? 0,\n', '    inseridas: body.inseridas ?? 0,\n    na_fila: Math.max(0, (await contarFila()) - antes),\n'),
    ],
    "lib/organizar-edicao.functions.ts": [
        ('    const aprovadas = noticias ?? [];',
         '    const aprovadas = (noticias ?? []) as Array<{ id: string; titulo: string; descricao: string | null; categoria: string | null; destaque: boolean | null; destino: string | null }>;'),
        ("const porId = new Map(aprovadas.map((n) => [n.id, n]));",
         "const porId = new Map<string, (typeof aprovadas)[number]>(aprovadas.map((n) => [n.id, n]));"),
        ('      .map((p) => `- "${p.palavra_chave}"', '      .map((p: { palavra_chave: string; peso: number }) => `- "${p.palavra_chave}"'),
    ],
    "lib/newsletter-ia.functions.ts": [
        ('    const todas = noticias ?? [];',
         '    const todas = (noticias ?? []) as Array<{ titulo: string; descricao: string | null; categoria: string | null; destaque: boolean | null; destino: string | null; ordem: number | null }>;'),
        ('(ferramentas ?? []).filter((f) =>', '((ferramentas ?? []) as Array<{ nome: string | null; descricao: string | null; emoji: string | null; posicao: number | null }>).filter((f) =>'),
    ],
    "lib/ferramentas.functions.ts": [
        ('new Set((ocupados ?? []).map((r) => r.posicao))', 'new Set(((ocupados ?? []) as Array<{ posicao: number }>).map((r) => r.posicao))'),
    ],
    "lib/emails-recebidos.functions.ts": [
        ('(rows ?? []).map((r) => {', '(rows ?? []).map((r: unknown) => {'),
        ('(audit ?? []).find((a) => {', '(audit ?? []).find((a: { detalhe?: unknown }) => {'),
    ],
    "lib/subscricao.server.ts": [
        ("\ninterface ResultadoAccao {", "\nexport interface ResultadoAccao {"),
        # E-goi webhook key: shared secret set by a human in E-goi and in server secrets (never derived/shown).
        ('export function chaveWebhookEgoi(): string {\n  return assinar("webhook:egoi:v1").slice(0, 32);\n}',
         'export function chaveWebhookEgoi(): string {\n  const k = (process.env.NL_EGOI_WEBHOOK_CHAVE ?? "").trim();\n  if (k.length < 24) throw new Error("NL_EGOI_WEBHOOK_CHAVE em falta");\n  return k;\n}'),
    ],
    # Destination host only; never embed BasicAuth credentials in a URL shown to the browser.
    "lib/definicoes.functions.ts": [
        ('    const host = process.env.APP_PUBLIC_HOST ?? "project--23514b53-4ffd-429e-81c5-46fedf7b5a3e.lovable.app";\n    const enc = (s: string) => encodeURIComponent(s);\n    return { url: `https://${enc(user)}:${enc(pass)}@${host}/api/public/hooks/email-newsletter` };',
         '    const { baseFuncoes } = await import("../../nl-publico-config.ts");\n    return { url: `${baseFuncoes()}/nl-hooks/email-newsletter` };'),
    ],
    "lib/subscricao.functions.ts": [
        # Subscription state/actions require a signed token; an e-mail alone never reads or changes anything.
        ('    if (data.email) return estadoPorEmail(data.email);\n    return { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Falta o email." };',
         '    return { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Ligação inválida ou incompleta." };'),
        ('    const { estadoSubscricao, estadoPorEmail } = await import("./subscricao.server.ts");',
         '    const { estadoSubscricao } = await import("./subscricao.server.ts");'),
        ('    const { aplicarAccao } = await import("./subscricao.server.ts");\n    return aplicarAccao(data);',
         '    const { aplicarAccao } = await import("./subscricao.server.ts");\n    if (!data.token) return { ok: false, estado: "activa" as const, retomaEm: null, mensagem: "Ligação inválida ou incompleta." };\n    return aplicarAccao({ ...data, email: null });'),
        ('    const { chaveWebhookEgoi } = await import("./subscricao.server.ts");\n    return { url: `https://newsletter-digital-sprint.lovable.app/api/public/hooks/egoi-subscricao?k=${chaveWebhookEgoi()}` };',
         '    const { baseFuncoes } = await import("../../nl-publico-config.ts");\n    // The key itself is never returned: a human sets NL_EGOI_WEBHOOK_CHAVE in E-goi and in server secrets.\n    return { url: `${baseFuncoes()}/nl-hooks/egoi-subscricao?k=<NL_EGOI_WEBHOOK_CHAVE>` };'),
    ],
    "edge-shared/gerar-html-newsletter.ts": [
        ('const AVATAR_URL = "https://newsletter-digital-sprint.lovable.app/__l5e/assets-v1/cadec3e2-5dd7-4a75-b8dc-14c0202c4200/frederico-avatar.jpg";',
         'const AVATAR_URL = avatarUrl();\nimport { avatarUrl } from "../../nl-publico-config.ts";'),
    ],
}

def build_server():
    shutil.rmtree(os.path.join(SRV, "lib"), ignore_errors=True)
    shutil.rmtree(os.path.join(SRV, "features"), ignore_errors=True)
    shutil.rmtree(os.path.join(SRV, "edge-shared"), ignore_errors=True)
    shutil.rmtree(os.path.join(SRV, "hooks"), ignore_errors=True)
    files = []
    # Internal hook handlers that server functions call directly (no public route here).
    for name in HOOKS_INTERNOS:
        files.append((os.path.join(SRC, "routes/api/public/hooks", name + ".ts.txt"), os.path.join(SRV, "hooks", name + ".ts")))
    for f in walk(os.path.join(SRC, "lib")):
        rel = os.path.relpath(f, SRC)[:-4]
        if rel.startswith("lib/newsletter-engine") or os.path.basename(rel).startswith(SKIP_LIB):
            continue
        if rel.endswith(".tsx"):
            continue
        files.append((f, os.path.join(SRV, rel)))
    # pure feature helpers that server code may import
    for f in walk(os.path.join(SRC, "features")):
        rel = os.path.relpath(f, SRC)[:-4]
        if rel.endswith(".ts"):
            files.append((f, os.path.join(SRV, rel)))
    edge = os.path.join(ROOT, "migration-reference/code/newsletter/supabase/functions/_shared")
    for f in glob.glob(os.path.join(edge, "*.ts.txt")):
        files.append((f, os.path.join(SRV, "edge-shared", os.path.basename(f)[:-4])))
    for src, dst in files:
        write(dst, "")  # create first so dir-vs-file resolution works
    for src, dst in files:
        body = server_rewrite(read(src), dst)
        for old, new in SERVER_FIXES.get(os.path.relpath(dst, SRV).replace(os.sep, "/"), []):
            if old not in body:
                raise SystemExit("port-newsletter: server fix pattern not found in %s: %s" % (dst, old))
            body = body.replace(old, new)
        write(dst, body)
    prune_client_only_features()
    mods = sorted(glob.glob(os.path.join(SRV, "lib/*.functions.ts")))
    lines = ["// GENERATED by scripts/port-newsletter.py — registry of server functions."]
    names = []
    for i, m in enumerate(mods):
        mod = os.path.basename(m).split(".functions.")[0]
        lines.append('import * as m%d from "./lib/%s";' % (i, os.path.basename(m)))
        names.append('  "%s": m%d,' % (mod, i))
    lines.append("export const MODULES: Record<string, Record<string, unknown>> = {\n%s\n};" % "\n".join(names))
    write(os.path.join(SRV, "registry.ts"), "\n".join(lines) + "\n")

def walk_ts(base):
    for d, _, fs in os.walk(base):
        for f in fs:
            if f.endswith(".ts"):
                yield os.path.join(d, f)

def prune_client_only_features():
    """Keep only feature helpers reachable from server code; React hooks/stores never ship to the server."""
    spec = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']""")
    raizes = [f for f in walk_ts(SRV) if not os.path.relpath(f, SRV).startswith("features" + os.sep)]
    vistos, pilha = set(), list(raizes)
    while pilha:
        f = os.path.realpath(pilha.pop())
        if f in vistos or not os.path.isfile(f):
            continue
        vistos.add(f)
        for sp in spec.findall(read(f)):
            if sp.startswith("."):
                alvo = os.path.normpath(os.path.join(os.path.dirname(f), sp))
                for c in (alvo, alvo + ".ts", os.path.join(alvo, "index.ts")):
                    if os.path.isfile(c):
                        pilha.append(c)
                        break
    for f in list(walk_ts(os.path.join(SRV, "features"))):
        if os.path.realpath(f) not in vistos:
            os.remove(f)
        elif re.search(r"""from ["'](react|zustand|@tanstack/)""", read(f)):
            raise SystemExit("port-newsletter: client-only module reachable from server: %s" % f)

def emit_server_types():
    """Type-checks the server tree (strict) and emits declarations the client stubs import."""
    out = os.path.join(CLI, "_tipos-servidor")
    shutil.rmtree(out, ignore_errors=True)
    r = subprocess.run(["npx", "tsc", "-p", os.path.join(ROOT, "tsconfig.nl-server.json"), "--noEmit", "false",
                        "--declaration", "--emitDeclarationOnly", "--outDir", out, "--rootDir", os.path.join(ROOT, "supabase/functions/_shared")],
                       cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-6000:], r.stderr[-2000:])
        raise SystemExit("port-newsletter: server type-check failed")
    for d, _, fs in os.walk(out):
        for f in fs:
            p = os.path.join(d, f)
            write(p, "// GENERATED by scripts/port-newsletter.py from the server tree — do not edit.\n" + read(p))

def walk_all(base):
    out = []
    for r, _, fs in os.walk(base):
        out += [os.path.join(r, f) for f in fs]
    return out

CLIENT_ANTES = []

def prune_stale_client():
    for f in CLIENT_ANTES:
        if f not in WRITTEN and os.path.isfile(f):
            os.remove(f)

if __name__ == "__main__":
    build_server()
    emit_server_types()
    build_client()
    prune_stale_client()
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts/verificar-grafo-edge.py")], cwd=ROOT)
    if r.returncode != 0:
        raise SystemExit("port-newsletter: edge import graph check failed")
    print("ok")
