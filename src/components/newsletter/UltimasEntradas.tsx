import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listarEntradas, type Entrada } from "@/services/entradas";

const fmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon",
});

function resumoNavegador(ua: string | null): string {
  if (!ua) return "—";
  const m = ua.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/);
  const so = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "";
  return [m?.[1]?.replace("Edg", "Edge"), so].filter(Boolean).join(" · ") || "Outro";
}

export function UltimasEntradas() {
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<Entrada[]>([]);
  const [haMais, setHaMais] = useState(false);
  const [erro, setErro] = useState(false);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async (p: number) => {
    setACarregar(true); setErro(false);
    try {
      const r = await listarEntradas(p);
      setLinhas(r.linhas); setHaMais(r.haMais); setPagina(p);
    } catch { setErro(true); }
    setACarregar(false);
  }, []);
  useEffect(() => { carregar(0); }, [carregar]);

  return (
    <section className="space-y-2 rounded-md border p-3 text-sm" aria-label="Últimas entradas">
      <h2 className="font-medium">Últimas entradas</h2>
      {erro ? (
        <p className="text-destructive">Não foi possível carregar as entradas. <Button size="sm" variant="link" onClick={() => carregar(pagina)}>Tentar de novo</Button></p>
      ) : aCarregar && linhas.length === 0 ? (
        <p className="text-muted-foreground">A carregar…</p>
      ) : linhas.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há entradas registadas.</p>
      ) : (
        <ul className="divide-y">
          {linhas.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 py-1.5 text-xs">
              <span className="tabular-nums">{fmt.format(new Date(e.criado_em))}</span>
              <span className="min-w-0 break-all">{e.email}</span>
              <span className="text-muted-foreground">{resumoNavegador(e.navegador)}</span>
              <span className={e.sucesso ? "text-success" : "text-destructive"}>{e.sucesso ? "Entrou" : "Recusada"}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between">
        <Button size="sm" variant="outline" disabled={pagina === 0 || aCarregar} onClick={() => carregar(pagina - 1)}>Mais recentes</Button>
        <Button size="sm" variant="outline" disabled={!haMais || aCarregar} onClick={() => carregar(pagina + 1)}>Mais antigas</Button>
      </div>
    </section>
  );
}
