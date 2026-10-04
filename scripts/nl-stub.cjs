// Builds a client RPC stub from an origin *.functions.ts source (uses the TS AST).
// Usage: node scripts/nl-stub.cjs <mod> < source  -> stub on stdout
const ts = require("typescript");
const mod = process.argv[2];
const src = require("fs").readFileSync(0, "utf8");
const sf = ts.createSourceFile("x.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const text = (n) => src.slice(n.getFullStart(), n.end);
const isServerFn = (st) => ts.isVariableStatement(st) && st.declarationList.declarations.some(d => d.initializer && /createServerFn/.test(d.initializer.getText()));
const names = (st) => ts.isVariableStatement(st) ? st.declarationList.declarations.map(d => d.name.getText()) : st.name ? [st.name.getText()] : [];
const exported = (st) => (ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export) !== 0 || (st.modifiers || []).some(m => m.kind === ts.SyntaxKind.ExportKeyword);
const out = []; const pending = []; const imports = [];
for (const st of sf.statements) {
  if (ts.isImportDeclaration(st)) { imports.push(st); continue; }
  if (isServerFn(st)) { for (const n of names(st)) out.push(`\nexport const ${n} = nlServerFn("${mod}:${n}");`); continue; }
  if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st) || ts.isExportDeclaration(st)) { out.push(text(st)); continue; }
  if (exported(st) && ts.isVariableStatement(st)) { out.push(text(st)); continue; }
  pending.push(st); // private helpers/consts: include only if referenced
}
let body = out.join("");
let changed = true;
while (changed) {
  changed = false;
  for (let i = pending.length - 1; i >= 0; i--) {
    const st = pending[i];
    if (ts.isFunctionDeclaration(st) && !exported(st)) continue;
    if (names(st).some(n => new RegExp(`\\b${n}\\b`).test(body))) { body = text(pending.splice(i,1)[0]) + body; changed = true; }
  }
}
const imp = [];
for (const st of imports) {
  const spec = st.moduleSpecifier.text;
  const cl = st.importClause; if (!cl) continue;
  if (/\.server/.test(spec)) {
    // server-only module: keep referenced type names as opaque aliases
    const els = cl.namedBindings && ts.isNamedImports(cl.namedBindings) ? cl.namedBindings.elements : [];
    for (const e of els) if (new RegExp(`\\b${e.name.text}\\b`).test(body)) imp.push(`type ${e.name.text} = any; // eslint-disable-line @typescript-eslint/no-explicit-any`);
    continue;
  }
  if (/react-start|auth-middleware|integrations\/supabase\/client/.test(spec)) continue;
  const used = [];
  if (cl.name && new RegExp(`\\b${cl.name.text}\\b`).test(body)) used.push({ def: cl.name.text });
  if (cl.namedBindings && ts.isNamedImports(cl.namedBindings)) for (const e of cl.namedBindings.elements) if (new RegExp(`\\b${e.name.text}\\b`).test(body)) used.push({ named: e.getText() });
  if (cl.namedBindings && ts.isNamespaceImport(cl.namedBindings) && new RegExp(`\\b${cl.namedBindings.name.text}\\b`).test(body)) used.push({ ns: cl.namedBindings.name.text });
  if (!used.length) continue;
  const tp = cl.isTypeOnly ? "type " : "";
  const def = used.find(u => u.def); const ns = used.find(u => u.ns); const named = used.filter(u => u.named).map(u => u.named);
  const parts = [def && def.def, ns && `* as ${ns.ns}`, named.length && `{ ${named.join(", ")} }`].filter(Boolean);
  imp.push(`import ${tp}${parts.join(", ")} from "${spec}";`);
}
process.stdout.write(imp.join("\n") + "\n" + body + "\n");
