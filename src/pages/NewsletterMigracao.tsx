import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MapeamentoPerfis } from "@/components/newsletter/MapeamentoPerfis";
import { enviarPacote, passoImportacao, simularImportacao, souAdminNewsletter, ultimaImportacao, type ImportRun, type Simulacao } from "@/services/estudio";
import { RelatorioImportacao } from "@/components/newsletter/RelatorioImportacao";

export default function NewsletterMigracao() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [relatorio, setRelatorio] = useState<Record<string, unknown> | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [retomavel, setRetomavel] = useState<ImportRun | null>(null);
  const [erroAdmin, setErroAdmin] = useState<string | null>(null);
  const verificar = () => {
    setErroAdmin(null);
    souAdminNewsletter().then(async (a) => {
      setAdmin(a);
      if (!a) return;
      // An interrupted import (or a passed simulation) can resume after reload.
      const r = await ultimaImportacao();
      if (r?.estado === "em_curso" && r.modo === "importacao") setRetomavel(r);
      else if (r?.estado === "concluida" && r.modo === "importacao" && r.relatorio) setRelatorio(r.relatorio);
    }).catch((e: Error) => setErroAdmin(e.message));
  };
  useEffect(verificar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const simular = async () => {
    if (!ficheiro) return;
    setOcupado(true); setErro(null); setSim(null); setRelatorio(null);
    try {
      setEstado("A enviar o pacote para o armazenamento privado…");
      const path = await enviarPacote(ficheiro);
      setEstado("A verificar hashes, tabelas e relações…");
      setSim(await simularImportacao(path));
      setEstado("");
    } catch (e) { setErro((e as Error).message); setEstado(""); }
    setOcupado(false);
  };

  const importar = async (runId = sim?.run_id) => {
    if (!runId) return;
    setOcupado(true); setErro(null); setRetomavel(null);
    try {
      for (let i = 0; i < 200; i++) {
        setEstado("A importar… não feches a página (se fechares, podes retomar depois).");
        let r: Awaited<ReturnType<typeof passoImportacao>> | null = null;
        // Transient network failures retry the same chunk (server is idempotent and re-checks the package hash).
        for (let t = 0; t < 3 && !r; t++) {
          try { r = await passoImportacao(runId); }
          catch (e) { if (t === 2 || !/fetch|network|rede|Failed/i.test((e as Error).message)) throw e; await new Promise((ok) => setTimeout(ok, 1500 * (t + 1))); }
        }
        if (!r) break;
        if (r.concluido) { setRelatorio(r.relatorio ?? {}); setProgresso(100); break; }
        if (r.progresso && r.total_tabelas) setProgresso(Math.min(95, Math.round((r.progresso.indice / r.total_tabelas) * 90)));
      }
      setEstado("");
    } catch (e) { setErro(`${(e as Error).message}. Podes retomar: a importação continua de onde parou.`); setEstado(""); }
    setOcupado(false);
  };

  if (erroAdmin) return (
    <div className="space-y-2 p-4 text-sm">
      <p className="text-destructive">Não foi possível verificar permissões: {erroAdmin}</p>
      <Button size="sm" variant="outline" onClick={verificar}>Tentar de novo</Button>
    </div>
  );
  if (admin === null) return <p className="p-4 text-sm text-muted-foreground">A verificar permissões…</p>;
  if (!admin) return <p className="p-4 text-sm">Apenas administradores podem importar os dados da newsletter.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Importar dados da newsletter</h1>
      <p className="text-sm"><a className="underline" href="/estudio/ligacoes">Ver ligações e chaves da newsletter</a></p>
      <p className="text-sm text-muted-foreground">O pacote é confidencial: fica num armazenamento privado e é apagado no fim. Os registos existentes nunca são substituídos, os agendamentos ficam suspensos e não são atribuídos papéis.</p>
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="font-medium">Antes de importar dados reais</p>
        <ul className="mt-1 list-disc pl-5 text-muted-foreground">
          <li>As passwords antigas, que estiveram expostas, têm de ser mudadas por cada utilizador em Definições → Segurança.</li>
          <li>Faz primeiro uma simulação e uma importação com um pacote de teste.</li>
          <li>Se o pacote mudar depois da simulação, a importação para e é preciso simular outra vez.</li>
        </ul>
      </div>
      {retomavel && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="font-medium">Há uma importação interrompida</p>
          <p className="text-muted-foreground">Iniciada em {new Date(retomavel.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · fase {retomavel.progresso?.fase ?? "—"} · tabela {(retomavel.progresso?.indice ?? 0) + 1}. Continua de onde parou; o pacote é verificado de novo antes de cada passo.</p>
          <Button size="sm" onClick={() => importar(retomavel.id)} disabled={ocupado}>Retomar importação</Button>
        </div>
      )}
      <label htmlFor="pacote" className="text-sm font-medium">Pacote de exportação (JSON)</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="pacote" type="file" accept="application/json,.json" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} disabled={ocupado} />
        <Button onClick={simular} disabled={!ficheiro || ocupado}>Simular</Button>
      </div>
      {estado && <p className="text-sm">{estado}</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {sim && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="text-sm font-medium">
            {sim.tabelas.length} tabelas · {sim.tabelas.reduce((s, t) => s + t.registos, 0)} registos · {sim.ficheiros} ficheiros
          </div>
          {sim.erros.length > 0 && <ul className="list-disc pl-5 text-sm text-destructive">{sim.erros.map((x) => <li key={x}>{x}</li>)}</ul>}
          {sim.avisos.length > 0 && <ul className="list-disc pl-5 text-sm text-muted-foreground">{sim.avisos.map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="max-h-64 overflow-auto text-xs">
            <table className="w-full"><thead><tr className="text-left"><th>Tabela</th><th>Registos</th><th>Já existem</th><th>Hash</th></tr></thead>
              <tbody>{sim.tabelas.map((t) => <tr key={t.nome}><td>{t.nome}</td><td>{t.registos}</td><td>{t.existentes}</td><td>{t.hash_ok ? "OK" : "Falhou"}</td></tr>)}</tbody></table>
          </div>
          <Button onClick={() => importar()} disabled={ocupado || sim.erros.length > 0}>Importar</Button>
          {progresso > 0 && <Progress value={progresso} />}
        </div>
      )}
      <MapeamentoPerfis />
      {relatorio && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Relatório da importação</div>
          <RelatorioImportacao relatorio={relatorio} />
        </div>
      )}
    </div>
  );
}
