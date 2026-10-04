import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MapeamentoPerfis } from "@/components/newsletter/MapeamentoPerfis";
import { enviarPacote, passoImportacao, simularImportacao, souAdminNewsletter, type Simulacao } from "@/services/estudio";

export default function NewsletterMigracao() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [relatorio, setRelatorio] = useState<Record<string, unknown> | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { souAdminNewsletter().then(setAdmin); }, []);

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

  const importar = async () => {
    if (!sim) return;
    setOcupado(true); setErro(null);
    try {
      for (let i = 0; i < 200; i++) {
        setEstado("A importar…");
        const r = await passoImportacao(sim.run_id);
        if (r.concluido) { setRelatorio(r.relatorio ?? {}); setProgresso(100); break; }
        if (r.progresso && r.total_tabelas) setProgresso(Math.min(95, Math.round((r.progresso.indice / r.total_tabelas) * 90)));
      }
      setEstado("");
    } catch (e) { setErro(`${(e as Error).message}. Podes retomar: a importação continua de onde parou.`); setEstado(""); }
    setOcupado(false);
  };

  if (admin === null) return <p className="p-4 text-sm text-muted-foreground">A verificar permissões…</p>;
  if (!admin) return <p className="p-4 text-sm">Apenas administradores podem importar os dados da newsletter.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Importar dados da newsletter</h1>
      <p className="text-sm text-muted-foreground">O pacote é confidencial: fica num armazenamento privado e é apagado no fim. Os registos existentes nunca são substituídos, os agendamentos ficam suspensos e não são atribuídos papéis.</p>
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="font-medium">Antes de importar dados reais</p>
        <ul className="mt-1 list-disc pl-5 text-muted-foreground">
          <li>As passwords antigas, que estiveram expostas, têm de ser mudadas por cada utilizador em Definições → Segurança.</li>
          <li>Faz primeiro uma simulação e uma importação com um pacote de teste.</li>
          <li>Se o pacote mudar depois da simulação, a importação para e é preciso simular outra vez.</li>
        </ul>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="file" accept="application/json,.json" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} disabled={ocupado} />
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
          <Button onClick={importar} disabled={ocupado || sim.erros.length > 0}>Importar</Button>
          {progresso > 0 && <Progress value={progresso} />}
        </div>
      )}
      <MapeamentoPerfis />
      {relatorio && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Relatório da importação</div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(relatorio, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
