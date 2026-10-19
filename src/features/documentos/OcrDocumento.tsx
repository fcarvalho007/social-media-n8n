import { useEffect, useRef, useState } from 'react';
import { ScanText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { ficheiroNuvem } from './acervoNuvem';
import { paginasParaOcr, type ResultadoOcr } from './ocr-modelo';
import type { DocumentoAcervo } from './modelo';

export function OcrDocumento({ documento: d, ocupado, onGuardar }: { documento: DocumentoAcervo; ocupado: boolean; onGuardar: (p: ResultadoOcr) => Promise<void> }) {
  const [ativo, setAtivo] = useState(false), [mensagem, setMensagem] = useState(''), [erro, setErro] = useState('');
  const controller = useRef<AbortController | null>(null), vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; controller.current?.abort(); }; }, [d.id]);
  useEffect(() => { if (!ativo) return; const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', aviso); return () => window.removeEventListener('beforeunload', aviso); }, [ativo]);
  const pendentes = paginasParaOcr(d.pdf.paginas), reconhecidas = d.pdf.paginas.filter(p => p.ocr).length;
  async function reconhecer() {
    if (controller.current || ocupado) return;
    const abort = new AbortController(); controller.current = abort; setAtivo(true); setErro(''); setMensagem('A abrir o original privado…');
    try {
      const f = BACKEND_NUVEM ? await ficheiroNuvem(d) : d.ficheiro;
      const { reconhecerPdf } = await import('./ocr');
      await reconhecerPdf(f, d.pdf.hash, pendentes.slice(0, 10).map(p => p.n), { signal: abort.signal, progresso: m => { if (vivo.current) setMensagem(m); }, guardar: onGuardar });
      if (vivo.current) setMensagem('Texto reconhecido e guardado. Confere números, nomes e tabelas no original antes de usar.');
    } catch (e) { if (vivo.current) { if (abort.signal.aborted) setMensagem('OCR interrompido. As páginas já guardadas mantêm-se disponíveis.'); else setErro(e instanceof Error ? e.message : 'Não foi possível carregar o motor OCR. Atualiza a página e tenta novamente.'); } }
    finally { controller.current = null; if (vivo.current) setAtivo(false); }
  }
  if (!pendentes.length && !reconhecidas && !ativo && !erro) return null;
  return <Alert><ScanText aria-hidden="true"/><AlertTitle>{pendentes.length ? 'Reconhecer texto de digitalizações' : 'Texto reconhecido por OCR'}</AlertTitle><AlertDescription><div className="flex flex-col gap-3">
    <p>{pendentes.length} {pendentes.length === 1 ? 'página por reconhecer' : 'páginas por reconhecer'} · {reconhecidas} {reconhecidas === 1 ? 'processada' : 'processadas'}. Português e inglês, sem custo por pedido. O reconhecimento decorre neste navegador; {BACKEND_NUVEM ? 'cada página fica guardada na biblioteca privada da nuvem' : 'o resultado fica guardado neste navegador'}.</p>
    {!!pendentes.length && <p className="text-xs">Até 10 páginas de cada vez. Mantém esta página aberta. Depois podes continuar de onde paraste.</p>}
    <div className="flex flex-wrap gap-2">{!!pendentes.length && <Button variant="outline" disabled={ativo || ocupado || d.processamento?.estado === 'a_processar'} onClick={() => void reconhecer()}>{ativo ? <Loader2 className="animate-spin" data-icon="inline-start"/> : <ScanText data-icon="inline-start"/>}{ativo ? 'A reconhecer…' : `Reconhecer ${Math.min(10, pendentes.length)} ${pendentes.length === 1 ? 'página' : 'páginas'}`}</Button>}{ativo && <Button variant="ghost" onClick={() => controller.current?.abort()}>Parar OCR</Button>}</div>
    {mensagem && <p role="status" className="text-sm">{mensagem}</p>}{erro && <p role="alert" className="text-destructive">{erro} Podes retomar as páginas em falta.</p>}
    {!ativo && !!reconhecidas && <p className="text-xs">O OCR pode confundir caracteres. O texto fica identificado por página com a confiança do reconhecimento; não equivale a aprovação editorial.</p>}
  </div></AlertDescription></Alert>;
}
