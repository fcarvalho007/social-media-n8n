import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { exportarMigracaoFn } from "@/lib/migracao-exportar.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/migracao-exportar")({
  head: () => ({
    meta: [
      { title: "Exportar para migração · Digital Sprint" },
      { name: "description", content: "Pacote de migração do editor da newsletter Digital Sprint, reservado ao administrador." },
      { property: "og:title", content: "Exportar para migração · Digital Sprint" },
      { property: "og:description", content: "Pacote de migração do editor da newsletter Digital Sprint, reservado ao administrador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaMigracao,
});

interface Manifest {
  gerado_em: string;
  completo: boolean;
  erros: string[];
  tabelas: { nome: string; ordem: number; registos: number }[];
  ficheiros: { caminho: string; bytes: number; content_type: string }[];
  exclusoes: { tabela: string; chave?: string; motivo: string }[];
  agendamentos: { edicoes_com_agendamento: unknown[] };
  verificacao: { sha256_global: string };
}

function PaginaMigracao() {
  const exportar = useServerFn(exportarMigracaoFn);
  const [aCorrer, setACorrer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);

  async function descarregar() {
    setACorrer(true); setErro(null);
    try {
      const texto = await exportar();
      const m = (JSON.parse(texto) as { manifest: Manifest }).manifest;
      setManifest(m);
      const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `digital-sprint-migracao-${m.gerado_em.replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setACorrer(false);
    }
  }

  const total = manifest?.tabelas.reduce((s, t) => s + t.registos, 0) ?? 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Exportar para migração</h1>
        <p className="text-sm text-muted-foreground">
          Gera um ficheiro com todos os dados do editor e as imagens da crónica, para importar no Estúdio de Conteúdos.
          Só lê dados: nada é alterado, publicado ou enviado. Contas, palavras-passe e chaves não são incluídas.
        </p>
      </header>

      <Button onClick={descarregar} disabled={aCorrer}>
        {aCorrer ? "A preparar o pacote…" : "Descarregar pacote de migração"}
      </Button>

      {erro && (
        <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{erro}</div>
      )}

      {manifest && (
        <section className="space-y-4">
          <div className={`rounded-md border p-3 text-sm ${manifest.completo ? "border-border" : "border-destructive text-destructive"}`}>
            {manifest.completo
              ? `Pacote completo: ${manifest.tabelas.length} tabelas, ${total} registos, ${manifest.ficheiros.length} ficheiros.`
              : `Pacote incompleto — ${manifest.erros.length} erro(s):`}
            {!manifest.completo && <ul className="mt-2 list-disc pl-5">{manifest.erros.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
          <p className="break-all text-xs text-muted-foreground">SHA-256 global: {manifest.verificacao.sha256_global}</p>

          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>#</th><th>Tabela</th><th className="text-right">Registos</th></tr></thead>
            <tbody>
              {manifest.tabelas.map((t) => (
                <tr key={t.nome} className="border-t border-border"><td>{t.ordem}</td><td>{t.nome}</td><td className="text-right">{t.registos}</td></tr>
              ))}
            </tbody>
          </table>

          <div className="text-sm">
            <h2 className="font-medium">Ficheiros</h2>
            <ul className="list-disc pl-5">{manifest.ficheiros.map((f) => <li key={f.caminho}>{f.caminho} · {f.content_type} · {f.bytes} bytes</li>)}</ul>
          </div>
          <div className="text-sm">
            <h2 className="font-medium">Exclusões</h2>
            <ul className="list-disc pl-5">{manifest.exclusoes.map((x, i) => <li key={i}>{x.tabela}{x.chave ? ` · ${x.chave}` : ""}: {x.motivo}</li>)}</ul>
          </div>
          <p className="text-sm">Edições com agendamento (a importar suspensas): {manifest.agendamentos.edicoes_com_agendamento.length}</p>
        </section>
      )}
    </main>
  );
}
