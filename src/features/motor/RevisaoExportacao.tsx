import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, FileDown, Loader2, RotateCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { lerExportacao, pedirExportacao, prepararRascunho, type EstadoExportacao, type TrabalhoCompleto } from "@/services/motor";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

interface Props {
  dados: TrabalhoCompleto;
  pacote: PacoteProva;
  medidor: Medidor | null;
  /** false while local edits are not yet saved as a server version */
  guardado: boolean;
}

const kb = (b: number) => `${(b / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} KB`;

export function RevisaoExportacao({ dados, pacote, medidor, guardado }: Props) {
  const [variante, setVariante] = useState<Variante>("A");
  const doc = dados.documentos[variante];
  const [estado, setEstado] = useState<EstadoExportacao | null>(null);
  const [aPedir, setAPedir] = useState(false);
  const [revisto, setRevisto] = useState(false);
  const [aPreparar, setAPreparar] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const ler = useCallback(async () => {
    if (!doc) return;
    try { setEstado(await lerExportacao(doc.id, doc.versao)); } catch (e) { toast.error((e as Error).message); }
  }, [doc]);

  useEffect(() => { setEstado(null); setRevisto(false); setDraft(null); void ler(); }, [ler]);

  const emCurso = estado?.exportacao && (estado.exportacao.estado === "pendente" || estado.exportacao.estado === "a_processar");
  useEffect(() => {
    if (!emCurso) return;
    const t = setTimeout(() => void ler(), 3000);
    return () => clearTimeout(t);
  }, [emCurso, estado, ler]);

  if (!doc) return <p className="text-sm text-muted-foreground">Esta variante ainda não tem design guardado.</p>;

  const ex = estado?.exportacao;
  const concluido = ex?.estado === "concluido";
  const pdf = estado?.ficheiros.find((f) => f.formato === "pdf");
  const zip = estado?.ficheiros.find((f) => f.formato === "zip");
  const pngs = estado?.ficheiros.filter((f) => f.formato === "png") ?? [];
  const desta = estado?.rascunhos.find((r) => r.versao === doc.versao);
  const anteriores = estado?.rascunhos.filter((r) => r.versao !== doc.versao) ?? [];
  const draftAtual = draft ?? desta?.draft_id ?? null;

  const exportar = async () => {
    setAPedir(true);
    try { await pedirExportacao(doc.id, doc.versao); await ler(); } catch (e) { toast.error((e as Error).message); } finally { setAPedir(false); }
  };
  const preparar = async () => {
    setAPreparar(true);
    try {
      const r = await prepararRascunho(doc.id, doc.versao, doc.proposta_versao);
      setDraft(r.draft_id);
      toast.success(r.existente ? "Este rascunho já existia — rever no Painel social" : "Rascunho preparado — rever no Painel social");
      await ler();
    } catch (e) { toast.error((e as Error).message); } finally { setAPreparar(false); }
  };

  return (
    <section className="space-y-4" aria-label="Revisão e exportação">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Variante</span>
        {(["A", "B"] as const).map((v) => (
          <Button key={v} size="sm" variant={variante === v ? "secondary" : "outline"} className="h-11 lg:h-8" aria-pressed={variante === v} disabled={!dados.documentos[v]} onClick={() => setVariante(v)}>
            {v}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">Design v{doc.versao} · texto (proposta) v{doc.proposta_versao}{doc.aprovada_versao === doc.versao ? " · revista e aprovada" : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground">A e B são alternativas de design, não redes. A mesma variante dá as imagens para o Instagram (PNG 1080×1350) e o documento para o LinkedIn (PDF vertical com as mesmas páginas).</p>

      {medidor && (
        <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Pré-visualização">
          {pacote.variantes[variante].paginas.map((p, i) => (
            <li key={p.id} className="w-28 shrink-0 overflow-hidden rounded border border-border sm:w-36">
              <PaginaCanvas pacote={pacote} variante={variante} indice={i} medidor={medidor} imagens={{}} escala={0.13} />
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-2 rounded-md border border-border p-3">
        <h2 className="text-sm font-semibold">Exportação no servidor</h2>
        {!guardado && <p className="text-xs text-destructive" role="note">Há alterações por guardar. A exportação usa sempre a última versão guardada (v{doc.versao}).</p>}
        {!ex && <p className="text-xs text-muted-foreground">Ainda não foi exportada esta versão. Podes exportar antes de aprovar, para rever os ficheiros finais.</p>}
        {emCurso && (
          <p className="flex items-center text-sm" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
            {ex.progresso?.paginas_feitas ? `${ex.progresso.paginas_feitas} de ${ex.paginas} páginas renderizadas.` : "Na fila do servidor."} Podes sair; continua no servidor.
          </p>
        )}
        {ex?.estado === "erro" && <p className="text-sm text-destructive" role="alert">{ex.erro ?? "A exportação falhou."} As páginas já guardadas são reaproveitadas.</p>}
        {(!ex || ex.estado === "erro") && (
          <Button size="sm" className="h-11 lg:h-8" disabled={aPedir} onClick={exportar}>
            {aPedir ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : ex ? <RotateCw className="mr-1.5 h-4 w-4" /> : <FileDown className="mr-1.5 h-4 w-4" />}
            {ex ? "Tentar de novo" : `Exportar variante ${variante} · v${doc.versao}`}
          </Button>
        )}
        {concluido && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ficheiros congelados desta versão; nunca são substituídos. Editar cria uma nova versão com ficheiros próprios.</p>
            <div className="flex flex-wrap gap-2">
              {zip && <Button asChild size="sm" variant="outline" className="h-11 lg:h-8"><a href={zip.url} download={zip.nome}><Download className="mr-1.5 h-4 w-4" />Instagram · ZIP ({pngs.length} PNG, {kb(zip.bytes)})</a></Button>}
              {pdf && <Button asChild size="sm" variant="outline" className="h-11 lg:h-8"><a href={pdf.url} download={pdf.nome} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-4 w-4" />LinkedIn · PDF ({kb(pdf.bytes)})</a></Button>}
            </div>
            <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Imagens individuais</summary>
              <ul className="mt-1 flex flex-wrap gap-2">{pngs.map((f) => <li key={f.url}><a className="underline" href={f.url} target="_blank" rel="noreferrer">{f.nome}</a></li>)}</ul>
            </details>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <h2 className="text-sm font-semibold">Rascunho para as redes sociais</h2>
        {draftAtual ? (
          <div className="space-y-1">
            <p className="text-sm" role="status">Rascunho preparado — rever no Painel social. Nada foi publicado.</p>
            <Button asChild size="sm" className="h-11 lg:h-8"><Link to={`/manual-create?draft=${draftAtual}`}><ExternalLink className="mr-1.5 h-4 w-4" />Abrir rascunho</Link></Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <Checkbox id="revisto" checked={revisto} onCheckedChange={(v) => setRevisto(v === true)} disabled={!concluido || !guardado} />
              <Label htmlFor="revisto" className="text-sm font-normal leading-snug">Revi o texto (v{doc.proposta_versao}) e o design da variante {variante} (v{doc.versao}). Aprovo esta versão para rascunho.</Label>
            </div>
            <Button size="sm" className="h-11 lg:h-8" disabled={!revisto || !concluido || !guardado || aPreparar} onClick={preparar}>
              {aPreparar ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Preparar rascunho social
            </Button>
            <p className="text-xs text-muted-foreground">{concluido ? "Cria um único rascunho (Instagram + LinkedIn) com estes ficheiros. A publicação continua a exigir aprovação no Painel social." : "Exporta esta versão primeiro."}</p>
          </>
        )}
        {anteriores.length > 0 && (
          <ul className="text-xs text-muted-foreground">
            {anteriores.map((r) => <li key={r.draft_id}>Rascunho da versão anterior v{r.versao}: <Link className="underline" to={`/manual-create?draft=${r.draft_id}`}>abrir</Link> (não corresponde à versão atual)</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
