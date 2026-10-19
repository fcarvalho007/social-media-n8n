import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { apiBackend } from '@/lib/backendHub';
import { abrirAcervoZip } from './importacao-zip';
import { documentosLegado, tituloLegado } from './legado';
import { projetoAcervo } from './acervoNuvem';
import type { DocumentoAcervo } from './modelo';
import type { PdfRecolhido } from './contratos';
type Relatorio = { exportadoEm: string; registos: number; objetos: number; hashes: string[]; pendencias: { titulo: string; ids: number[]; erro: string }[] };
export function ImportarAcervoNuvem({ ambito, docs, ocupado, onGuardar }: { ambito: string; docs: DocumentoAcervo[]; ocupado: boolean; onGuardar: (f: File, p: PdfRecolhido) => Promise<unknown> }) {
  const input = useRef<HTMLInputElement>(null), parar = useRef(false), trava = useRef(false);
  const [pacote, setPacote] = useState<Awaited<ReturnType<typeof abrirAcervoZip>> | null>(null);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null), [erro, setErro] = useState(''), [mensagem, setMensagem] = useState(''), [ativo, setAtivo] = useState(false), [feitos, setFeitos] = useState(0), [total, setTotal] = useState(0);
  useEffect(() => { let vivo = true; void apiBackend<Relatorio | null>('/documentos/legado-resumo', {}, { projeto: projetoAcervo(ambito) }).then(r => { if (vivo) setRelatorio(r); }).catch(e => { if (vivo) setErro(e.message); }); return () => { vivo = false; parar.current = true; }; }, [ambito]);
  useEffect(() => { if (!ativo) return; const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', aviso); return () => window.removeEventListener('beforeunload', aviso); }, [ativo]);
  const entradas = pacote ? documentosLegado(pacote.catalogo) : [];
  const pendentes = entradas.filter(e => !docs.some(d => d.pdf.hash === e.hash && d.legado && e.registos.every(r => d.legado?.registos.some(x => x.id === r.id))));
  async function abrir(f: File) { setErro(''); setMensagem('A conferir o ZIP…'); try { setPacote(await abrirAcervoZip(f)); setMensagem('Acervo conferido. Confirma abaixo os ficheiros a importar.'); } catch (e) { setErro((e as Error).message); } }
  async function importar() {
    if (!pacote || trava.current || ocupado) return; trava.current = true; parar.current = false; setAtivo(true); setErro(''); setFeitos(0); setTotal(pendentes.length);
    try {
      const c = pacote.catalogo; const r: Relatorio = { exportadoEm: c.exportadoEm, registos: c.registos, objetos: c.objetos, hashes: entradas.map(e => e.hash!), pendencias: c.entradas.filter(e => !e.hash).map(e => ({ titulo: tituloLegado(e), ids: e.registos.map(r => r.id), erro: e.erro || 'Original em falta no acervo antigo.' })) };
      await apiBackend('/documentos/legado-relatorio', { relatorio: r }, { projeto: projetoAcervo(ambito) }); setRelatorio(r);
      for (const e of pendentes) {
        if (parar.current) break;
        setMensagem(tituloLegado(e));
        const r = e.registos.find(r => !r.deleted_at) ?? e.registos[0];
        await onGuardar(await pacote.ficheiro(e.hash!, e.nome), { url: e.url, origem: e.url, titulo: tituloLegado(e), tipo: 'pdf', publicadoEm: null, hash: e.hash!, bytes: e.bytes!, fonteId: 0, nomeFonte: r?.publisher || 'PDF Tracker', categoria: r?.category, estado: 'descarregado', legado: { projeto: c.projeto, exportadoEm: c.exportadoEm, registos: e.registos, objeto: e.nome, orfao: e.orfao } });
        setFeitos(n => n + 1);
      }
      setMensagem(parar.current ? 'Importação interrompida. Os documentos concluídos ficaram guardados.' : 'Importação concluída. Originais, capas, texto e metadados guardados no projeto.');
    } catch (e) { setErro((e as Error).message + ' Podes retomar sem duplicar os documentos já guardados.'); }
    finally { setAtivo(false); trava.current = false; }
  }
  return <details className="rounded-xl border bg-card p-4"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Importar acervo antigo{relatorio ? ` · ${docs.filter(d => relatorio.hashes.includes(d.pdf.hash) && d.legado).length} de ${relatorio.hashes.length} PDFs no projeto` : ''}</summary><div className="flex flex-col gap-4 pt-3">
    <p className="text-sm text-muted-foreground">Escolhe a cópia ZIP do PDF Tracker. A importação preserva resumos, etiquetas e estados antigos. Ficheiros iguais são reconhecidos pela assinatura; títulos e leitura já editados não são substituídos.</p>
    <input ref={input} className="sr-only" type="file" accept=".zip,application/zip" aria-label="ZIP do acervo PDF Tracker" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void abrir(f); }}/>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={ativo || ocupado} onClick={() => input.current?.click()}><Upload data-icon="inline-start"/>Escolher ZIP do acervo</Button>{pacote && <Button disabled={ativo || ocupado || !pendentes.length} onClick={() => void importar()}>{ativo && <Loader2 className="animate-spin" data-icon="inline-start"/>}Importar {pendentes.length} PDFs para este projeto</Button>}{ativo && <Button variant="outline" onClick={() => { parar.current = true; setMensagem('A concluir o documento atual antes de parar…'); }}>Parar após este PDF</Button>}</div>
    {mensagem && <p role="status" className="break-words text-sm">{mensagem}</p>}{ativo && <><Progress value={feitos / Math.max(1, total) * 100} aria-label="Progresso da importação"/><p className="text-xs text-muted-foreground">{feitos} de {total} nesta passagem. Mantém a página aberta; podes retomar com o mesmo ZIP.</p></>}
    {erro && <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
    {relatorio && <div className="flex flex-col gap-2 text-sm"><p>{relatorio.registos} registos de origem · {relatorio.objetos} objetos · {relatorio.hashes.length} PDFs únicos recuperáveis.</p>{relatorio.pendencias.map(p => <p key={p.ids.join(',')} className="text-muted-foreground">Por recuperar · {p.titulo} · ID {p.ids.join(', ')}: {p.erro}</p>)}</div>}
  </div></details>;
}
