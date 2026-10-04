const NOMES: Record<string, string> = {
  inseridos: "Registos inseridos por tabela",
  ignoradas: "Registos já existentes (não substituídos)",
  reescritas: "Endereços de imagens reescritos",
  avatares_reescritos: "Avatares reescritos",
  ficheiros: "Ficheiros copiados",
  erros: "Erros",
  avisos: "Avisos",
  falha: "Falha",
  ligacoes_subscricao_historicas: "Ligações de subscrição históricas",
};

function Valor({ v }: { v: unknown }) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>;
  if (Array.isArray(v)) return v.length ? <ul className="list-disc pl-4">{v.map((x, i) => <li key={i}><Valor v={x} /></li>)}</ul> : <span className="text-muted-foreground">nenhum</span>;
  if (typeof v === "object") {
    const e = Object.entries(v as Record<string, unknown>);
    if (!e.length) return <span className="text-muted-foreground">nenhum</span>;
    return <table className="w-full text-xs"><tbody>{e.map(([k, x]) => <tr key={k} className="align-top"><td className="pr-2 font-mono">{k}</td><td><Valor v={x} /></td></tr>)}</tbody></table>;
  }
  if (typeof v === "number") return <span>{v.toLocaleString("pt-PT")}</span>;
  return <span>{String(v)}</span>;
}

/** Human-readable import report (aggregate counts only; never row contents). */
export function RelatorioImportacao({ relatorio }: { relatorio: Record<string, unknown> }) {
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(relatorio).map(([k, v]) => (
        <div key={k} className="grid gap-1 sm:grid-cols-[14rem_1fr]">
          <dt className="text-muted-foreground">{NOMES[k] ?? k}</dt>
          <dd className="max-h-60 overflow-auto"><Valor v={v} /></dd>
        </div>
      ))}
    </dl>
  );
}
