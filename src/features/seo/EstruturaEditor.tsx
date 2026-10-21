import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from '@/lib/recuperacaoLocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiSeo } from './api';
import type { PautaEditorial } from './contratos';
import { bloqueiosEstrutura, type EstruturaArtigo } from './sequencia';

const vazia = (): EstruturaArtigo => ({ pergunta: '', titulo: '', secoes: [{ titulo: '', pontos: '', fonteIds: [] }, { titulo: '', pontos: '', fonteIds: [] }], alertas: [] });
export function EstruturaEditor({ pauta, sujo, orcamentar, atualizar, onGuardada }: { pauta: PautaEditorial; sujo: boolean; orcamentar: () => void; atualizar: () => Promise<unknown>; onGuardada: (p: PautaEditorial) => void }) {
  const [r, setR] = useState<EstruturaArtigo>(()=>pauta.estrutura?.conteudo ?? vazia()), [base, setBase] = useState(r), [versao, setVersao] = useState(pauta.versao);
  const [confirmado, setConfirmado] = useState(false), [erro, setErro] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const chave = user ? chaveRecuperacao(user.id, 'estrutura-seo', pauta.id, pauta.siteId) : null;
  const [recuperacao, setRecuperacao] = useState(() => user && chave ? lerRecuperacao<EstruturaArtigo>(chave,user.id) : null);
  useEffect(() => { if(chave&&JSON.stringify(r)!==JSON.stringify(base))guardarRecuperacao(chave,r); },[chave,r,base]);
  const alterado = JSON.stringify(r) !== JSON.stringify(base), conflito = versao !== pauta.versao, falhas = bloqueiosEstrutura(r, pauta.fontes);
  useEffect(() => { if (!alterado) { const novo = pauta.estrutura?.conteudo ?? vazia(); setR(novo); setBase(novo); setVersao(pauta.versao); setConfirmado(false); } }, [pauta.versao, pauta.estrutura, alterado]);
  useEffect(() => { if (!alterado) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [alterado]);
  const mudar = (v: EstruturaArtigo) => { setR(v); setConfirmado(false); };
  async function guardar() {
    setBusy(true); setErro(null);
    try { const p = await apiSeo<PautaEditorial>('confirmar-estrutura', { id: pauta.id, versao, estrutura: r, confirmacao: confirmado }); setBase(r);if(chave)limparRecuperacao(chave);setRecuperacao(null);setVersao(p.versao); setConfirmado(false); await atualizar(); onGuardada(p); }
    catch (x) { setErro((x as Error).message); } finally { setBusy(false); }
  }
  return <section className="flex min-w-0 flex-col gap-5" aria-label="Estrutura antes da redação">
    <header><h4 className="text-lg font-semibold">Decide o que o artigo vai resolver</h4><p className="mt-2 max-w-prose text-sm text-muted-foreground">Organiza a resposta antes de escrever. Cada secção precisa de pontos concretos e suporte nas fontes. Podes preparar a estrutura manualmente, sem custo, ou pedir uma proposta.</p></header>
    <p role="status" className="text-sm font-medium">{pauta.estruturaAtual ? 'Estrutura confirmada para o contexto atual' : pauta.estrutura ? 'Brief, fontes ou marca alterados · confirmar novamente' : 'Estrutura por preparar'}</p>
    {recuperacao&&<Alert><AlertDescription><p>Há uma estrutura editada por recuperar.</p><Button variant="outline" className="mt-3 min-h-11" onClick={()=>{setR(recuperacao.dados);setConfirmado(false);setRecuperacao(null);}}>Recuperar estrutura</Button></AlertDescription></Alert>}
    {sujo && <Alert><AlertDescription>Guarda primeiro as alterações do brief e das fontes.</AlertDescription></Alert>}
    {conflito && alterado && <Alert><AlertDescription>A pauta mudou. A tua estrutura continua no formulário. Reabre a versão guardada antes de confirmar.</AlertDescription></Alert>}
    {pauta.propostaEstrutura && <div className="flex flex-col gap-3 rounded-lg border p-4"><p className="text-sm">Há uma proposta de estrutura por rever. Não substituiu o plano guardado.</p><details><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary underline">Ler proposta</summary><p className="py-2 text-sm font-medium">{pauta.propostaEstrutura.conteudo.pergunta}</p><ol className="list-decimal space-y-3 pl-5 text-sm">{pauta.propostaEstrutura.conteudo.secoes.map((s, i) => <li key={i}><strong>{s.titulo}</strong><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{s.pontos}</p></li>)}</ol></details><Button variant="outline" className="min-h-11 self-start" disabled={alterado || sujo} onClick={() => mudar(pauta.propostaEstrutura!.conteudo)}>Trazer proposta para revisão</Button></div>}
    <Button variant="outline" className="min-h-11 self-start" disabled={sujo || alterado || busy || pauta.estado === 'a_preparar' || !!pauta.propostaEstrutura} onClick={orcamentar}>Propor estrutura com IA · rever custo</Button>
    <fieldset disabled={busy || sujo} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2"><Label htmlFor="estrutura-pergunta">Pergunta principal do leitor</Label><Input id="estrutura-pergunta" className="min-h-11" value={r.pergunta} maxLength={500} onChange={e => mudar({ ...r, pergunta: e.target.value })} /></div>
      <div className="flex flex-col gap-2"><Label htmlFor="estrutura-titulo">Título proposto</Label><Input id="estrutura-titulo" className="min-h-11" value={r.titulo} maxLength={200} onChange={e => mudar({ ...r, titulo: e.target.value })} /></div>
      {r.secoes.map((s, i) => <div key={i} className="flex min-w-0 flex-col gap-3 border-t pt-4"><div className="flex items-center justify-between gap-2"><h5 className="font-medium">Secção {i + 1}</h5><Button className="min-h-11" variant="ghost" disabled={r.secoes.length <= 2} onClick={() => mudar({ ...r, secoes: r.secoes.filter((_, j) => j !== i) })}>Retirar secção</Button></div>
        <Label htmlFor={`estrutura-seccao-${i}`}>Subtítulo</Label><Input id={`estrutura-seccao-${i}`} className="min-h-11" maxLength={180} value={s.titulo} onChange={e => mudar({ ...r, secoes: r.secoes.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x) })} />
        <Label htmlFor={`estrutura-pontos-${i}`}>O que explicar, demonstrar ou comparar</Label><Textarea id={`estrutura-pontos-${i}`} rows={3} maxLength={1600} value={s.pontos} onChange={e => mudar({ ...r, secoes: r.secoes.map((x, j) => j === i ? { ...x, pontos: e.target.value } : x) })} />
        <p className="text-xs font-medium">Fontes de suporte</p>{pauta.fontes.filter(f => f.aprovada).map(f => <label key={f.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><Checkbox checked={s.fonteIds.includes(f.id)} onCheckedChange={v => mudar({ ...r, secoes: r.secoes.map((x, j) => j === i ? { ...x, fonteIds: v === true ? [...new Set([...x.fonteIds, f.id])] : x.fonteIds.filter(id => id !== f.id) } : x) })} />{f.titulo || f.url}</label>)}
        {!pauta.fontes.some(f => f.aprovada) && <p className="text-xs text-muted-foreground">Confirma primeiro as fontes no separador Fontes.</p>}
      </div>)}
      <Button variant="outline" className="min-h-11 self-start" disabled={r.secoes.length >= 10} onClick={() => mudar({ ...r, secoes: [...r.secoes, { titulo: '', pontos: '', fonteIds: [] }] })}>Adicionar secção</Button>
      <div className="flex flex-col gap-2"><Label htmlFor="estrutura-alertas">Lacunas por resolver, uma por linha</Label><Textarea id="estrutura-alertas" rows={2} value={r.alertas.join('\n')} onChange={e => mudar({ ...r, alertas: e.target.value.split('\n').filter(Boolean) })} /></div>
      {falhas.length > 0 && <p className="text-xs text-muted-foreground">{falhas.join(' ')}</p>}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox className="mt-1" checked={confirmado} onCheckedChange={v => setConfirmado(v === true)} /><span>Revi a pergunta, as secções e o suporte das fontes<span className="mt-1 block text-xs text-muted-foreground">Confirmar esta estrutura não gera texto nem publica o artigo.</span></span></label>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button className="min-h-11 self-start" disabled={!confirmado || !!falhas.length || conflito} onClick={() => void guardar()}>{busy ? 'A guardar…' : 'Confirmar estrutura'}</Button>
      <p className="text-xs text-muted-foreground">{alterado ? 'Estrutura editada por confirmar. Mantém este editor aberto até guardar.' : 'Nenhuma alteração da estrutura por confirmar.'}</p>
    </fieldset>
  </section>;
}
