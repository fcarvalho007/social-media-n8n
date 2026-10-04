import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MapeamentoPerfis } from "@/components/newsletter/MapeamentoPerfis";
import { enviarPacote, passoImportacao, simularImportacao, souAdminNewsletter, ultimaImportacao, verificarSimulacao, type ImportRun, type Simulacao } from "@/services/estudio";
import { supabase } from "@/integrations/supabase/client";
import { decidirAposReload, executarImportacao } from "@/lib/importacao/controlo";
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
  const [versaoPerfis, setVersaoPerfis] = useState(0);

  const [retomavel, setRetomavel] = useState<ImportRun | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroAdmin, setErroAdmin] = useState<string | null>(null);
  const verificar = () => {
    setErroAdmin(null);
    souAdminNewsletter().then(async (a) => {
      setAdmin(a);
      if (!a) return;
      // An interrupted import (or a passed simulation) can resume after reload.
      const [r, { data: u }] = await Promise.all([ultimaImportacao(), supabase.auth.getUser()]);
      if (!u.user) return;
      const d = decidirAposReload(r, u.user.id);
      if (d.tipo === "retomar") setRetomavel(r);
      else if (d.tipo === "relatorio") setRelatorio(d.relatorio);
      else if (d.tipo === "nova_simulacao") setAviso(`${d.motivo} Faz uma nova simulação.`);
      else if (d.tipo === "simulacao_por_verificar") {
        const v = await verificarSimulacao(d.run.id);
        if (v.valido && v.simulacao) setSim(v.simulacao);
        else setAviso(`A simulação anterior já não é válida: ${v.motivo ?? "motivo desconhecido"} Faz uma nova simulação.`);
      }
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

  // The run id stays resumable until the server proves completion.
  const importar = async (runId = retomavel?.id ?? sim?.run_id) => {
    if (!runId) return;
    setOcupado(true); setErro(null); setAviso(null);
    setEstado("A importar… não feches a página (se fechares, podes retomar depois).");
    try {
      const r = await executarImportacao(runId, passoImportacao, { onProgresso: (pct) => setProgresso(pct) });
      if (r.estado === "concluida") { setRelatorio(r.relatorio); setRetomavel(null); setSim(null); setVersaoPerfis((n) => n + 1); }
      else setAviso(`Pausa após ${r.passos} passos: a importação ainda não terminou. Carrega em «Retomar importação» para continuar.`);
      if (r.estado === "pausa") setRetomavel((x) => x ?? ({ id: runId } as ImportRun));
    } catch (e) {
      setErro(`${(e as Error).message}. Podes retomar: a importação continua de onde parou.`);
      setRetomavel((x) => x ?? ({ id: runId } as ImportRun));
    }
    setEstado(""); setOcupado(false);
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
          <li>Faz primeiro uma simulação e uma importação com um pacote de teste; o hash do pacote é verificado na simulação e antes de cada passo.</li>

          <li>Se o pacote mudar depois da simulação, a importação para e é preciso simular outra vez.</li>
        </ul>
      </div>
      {retomavel && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="font-medium">Há uma importação interrompida</p>
          <p className="text-muted-foreground">{retomavel.created_at ? `Iniciada em ${new Date(retomavel.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · ` : ""}fase {retomavel.progresso?.fase ?? "—"} · tabela {(retomavel.progresso?.indice ?? 0) + 1}. Continua de onde parou; o pacote é verificado de novo antes de cada passo.</p>
          <Button size="sm" onClick={() => importar(retomavel.id)} disabled={ocupado}>Retomar importação</Button>
          {progresso > 0 && <Progress value={progresso} />}
        </div>
      )}
      <label htmlFor="pacote" className="text-sm font-medium">Pacote de exportação (JSON)</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="pacote" type="file" accept="application/json,.json" onChange={(e) => { setFicheiro(e.target.files?.[0] ?? null); setSim(null); setProgresso(0); setAviso(null); }} disabled={ocupado} />
        <Button onClick={simular} disabled={!ficheiro || ocupado}>Simular</Button>
      </div>
      {estado && <p className="text-sm">{estado}</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {aviso && <p role="status" className="text-sm">{aviso}</p>}
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
          {progresso > 0 && !retomavel && <Progress value={progresso} />}
        </div>
      )}
      <MapeamentoPerfis versao={versaoPerfis} />
      {relatorio && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Relatório da importação</div>
          <RelatorioImportacao relatorio={relatorio} />
        </div>
      )}
    </div>
  );
}
