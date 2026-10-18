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
import { EscolhaSeo } from './ComponentesSeo';
import type { SiteEditorial } from './contratos';
import { conhecimentoVazio, paginaDoSite, urlPublicaEditorial, type ConhecimentoMarca } from './sequencia';

export function ConhecimentoEditor({ site, atualizar }: { site: SiteEditorial; atualizar: () => Promise<unknown> }) {
  const [c, setC] = useState<ConhecimentoMarca>(site.conhecimento ?? conhecimentoVazio), [base, setBase] = useState(c);
  const [abertas,setAbertas]=useState<Set<string>>(new Set());
  const expandir=(id:string,aberta:boolean)=>setAbertas(v=>{if(v.has(id)===aberta)return v;const novo=new Set(v);if(aberta)novo.add(id);else novo.delete(id);return novo;});
  const [erro, setErro] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const chave = user ? chaveRecuperacao(user.id, 'conhecimento-seo', site.id, site.id) : null;
  const [recuperacao, setRecuperacao] = useState(() => user && chave ? lerRecuperacao<ConhecimentoMarca>(chave, user.id) : null);
  useEffect(() => { if (chave && JSON.stringify(c) !== JSON.stringify(base)) guardarRecuperacao(chave,c); }, [chave,c,base]);
  const sujo = JSON.stringify(c) !== JSON.stringify(base), conflito = (site.conhecimento?.revista ?? 0) !== base.revista;
  useEffect(() => { if (!sujo) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [sujo]);
  async function guardar() { setBusy(true); setErro(null); try { const s = await apiSeo<SiteEditorial>('conhecimento', { siteId: site.id, conhecimento: c }); setC(s.conhecimento!); setBase(s.conhecimento!); if(chave)limparRecuperacao(chave);setRecuperacao(null);await atualizar(); } catch (x) { setErro((x as Error).message); } finally { setBusy(false); } }
  const editarFonte = (i: number, valores: Partial<ConhecimentoMarca['referencias'][number]>) => setC(v => ({ ...v, referencias: v.referencias.map((f, j) => j === i ? { ...f, ...valores } : f) }));
  const editarPagina = (i: number, valores: Partial<ConhecimentoMarca['paginas'][number]>) => setC(v => ({ ...v, paginas: v.paginas.map((f, j) => j === i ? { ...f, ...valores } : f) }));
  return <form onSubmit={e => { e.preventDefault(); void guardar(); }} className="flex min-w-0 flex-col gap-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">Conhecimento de {site.nome}</h3><p className="mt-2 max-w-prose text-sm text-muted-foreground">Referências, instruções e páginas do próprio site que o motor pode reutilizar. A aprovação é tua; guardar uma ligação não comprova que esteja acessível ou atualizada.</p></div><Button type="submit" className="min-h-11" disabled={!sujo || busy || conflito}>{busy ? 'A guardar…' : 'Guardar conhecimento'}</Button></header>
    {recuperacao&&<Alert><AlertDescription><p>Há alterações locais por recuperar nesta marca.</p><Button type="button" variant="outline" className="mt-3 min-h-11" onClick={()=>{setC(recuperacao.dados);setRecuperacao(null);}}>Recuperar formulário</Button></AlertDescription></Alert>}
    {conflito && <Alert><AlertDescription>Há uma revisão mais recente desta marca. O formulário foi preservado; reabre antes de guardar.</AlertDescription></Alert>}
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2"><Label htmlFor="conhecimento-instrucoes">Instruções editoriais específicas</Label><Textarea id="conhecimento-instrucoes" rows={4} value={c.instrucoes} maxLength={6000} onChange={e => setC({ ...c, instrucoes: e.target.value })} placeholder="Terminologia, exemplos autorizados, forma de tratar o leitor e o que nunca deve ser inventado…" /></div>
      <div className="flex flex-col gap-2"><Label htmlFor="conhecimento-evitar">Expressões a evitar, uma por linha</Label><Textarea id="conhecimento-evitar" rows={2} value={c.evitar.join('\n')} onChange={e => setC({ ...c, evitar: e.target.value.split('\n').filter(Boolean) })} /></div>
      <section className="flex min-w-0 flex-col gap-4 border-t pt-5"><div><h4 className="text-lg font-semibold">Referências reutilizáveis</h4><p className="mt-1 max-w-prose text-sm text-muted-foreground">Guias, documentação e factos comerciais que confirmaste. A correspondência de tema sugere até três fontes; não certifica que sustentam todas as afirmações do artigo.</p></div>
        {c.referencias.map((f, i) => <details key={f.id} className="border-b pb-3" open={abertas.has(f.id)} onToggle={e=>expandir(f.id,e.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium"><span>{f.titulo || `Nova referência ${i + 1}`}</span><span className="shrink-0 text-xs font-normal text-muted-foreground">{f.aprovada ? 'Aprovada' : 'Por confirmar'}</span></summary><div className="mt-3 flex flex-col gap-3">
          <Label htmlFor={`marca-fonte-titulo-${i}`}>Título da referência</Label><Input id={`marca-fonte-titulo-${i}`} className="min-h-11" value={f.titulo} maxLength={300} onChange={e => editarFonte(i, { titulo: e.target.value, aprovada: false, verificadaEm: '' })} />
          <Label htmlFor={`marca-fonte-url-${i}`}>URL original HTTPS</Label><Input id={`marca-fonte-url-${i}`} className="min-h-11" type="url" value={f.url} maxLength={2000} onChange={e => editarFonte(i, { url: e.target.value, aprovada: false, verificadaEm: '' })} />
          <Label htmlFor={`marca-fonte-excerto-${i}`}>Excerto que pode ser usado como referência</Label><Textarea id={`marca-fonte-excerto-${i}`} rows={5} value={f.excerto} maxLength={12000} onChange={e => editarFonte(i, { excerto: e.target.value, aprovada: false, verificadaEm: '' })} />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox className="mt-1" checked={f.aprovada} disabled={f.excerto.trim().length < 200 || !f.titulo.trim() || !urlPublicaEditorial(f.url)} onCheckedChange={v => editarFonte(i, { aprovada: v === true, verificadaEm: v === true ? new Date().toISOString() : '' })} /><span>Li e confirmo esta referência para utilização editorial<span className="mt-1 block text-xs text-muted-foreground">Alterar o excerto ou a origem retira a aprovação.</span></span></label>
          <Button type="button" className="min-h-11 self-start" variant="ghost" onClick={() => setC({ ...c, referencias: c.referencias.filter((_, j) => j !== i) })}>Retirar referência da marca</Button>
        </div></details>)}
        {!c.referencias.length && <p className="text-sm text-muted-foreground">Começa por um guia ou documento que usas frequentemente. Não é preciso voltar a confirmar a mesma referência em todos os artigos.</p>}
        <Button type="button" variant="outline" className="min-h-11 self-start" disabled={c.referencias.length >= 12} onClick={() => {const id=crypto.randomUUID();expandir(id,true);setC({ ...c, referencias: [...c.referencias, { id, titulo: '', url: '', excerto: '', verificadaEm: '', aprovada: false }] });}}>Adicionar referência</Button>
      </section>
      <section className="flex min-w-0 flex-col gap-4 border-t pt-5"><div><h4 className="text-lg font-semibold">Páginas existentes e ligações internas</h4><p className="mt-1 max-w-prose text-sm text-muted-foreground">Inventário editorial de {site.dominio}. Ajuda a escolher ligações úteis e a decidir entre criar ou atualizar. Introduz a URL canónica, sem parâmetros; confirma o destino no site.</p></div>
        {c.paginas.map((p, i) => <details key={p.id} className="border-b pb-3" open={abertas.has(p.id)} onToggle={e=>expandir(p.id,e.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium"><span>{p.titulo || `Nova página ${i + 1}`}</span><span className="shrink-0 text-xs font-normal text-muted-foreground">{p.aprovada ? 'Aprovada' : 'Por confirmar'}</span></summary><div className="mt-3 flex flex-col gap-3">
          <Label htmlFor={`pagina-titulo-${i}`}>Título da página</Label><Input id={`pagina-titulo-${i}`} className="min-h-11" maxLength={200} value={p.titulo} onChange={e => editarPagina(i, { titulo: e.target.value, aprovada: false, verificadaEm: '' })} />
          <Label htmlFor={`pagina-url-${i}`}>URL canónica do próprio site</Label><Input id={`pagina-url-${i}`} className="min-h-11" type="url" value={p.url} onChange={e => editarPagina(i, { url: e.target.value, aprovada: false, verificadaEm: '' })} />
          <Label htmlFor={`pagina-tema-${i}`}>O que o leitor encontra nesta página</Label><Textarea id={`pagina-tema-${i}`} rows={2} maxLength={500} value={p.tema} onChange={e => editarPagina(i, { tema: e.target.value, aprovada: false, verificadaEm: '' })} />
          <Label htmlFor={`pagina-keyword-${i}`}>Keyword ou intenção principal</Label><Input id={`pagina-keyword-${i}`} className="min-h-11" maxLength={80} value={p.keyword} onChange={e => editarPagina(i, { keyword: e.target.value, aprovada: false, verificadaEm: '' })} />
          <EscolhaSeo id={`pagina-tipo-${i}`} rotulo="Função da página" valor={p.tipo} onChange={v => editarPagina(i, { tipo: v as typeof p.tipo, aprovada: false, verificadaEm: '' })} opcoes={[{ valor: 'artigo', nome: 'Artigo existente' }, { valor: 'oferta', nome: 'Formação ou serviço' }, { valor: 'recurso', nome: 'Guia ou recurso' }]} />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox className="mt-1" checked={p.aprovada} disabled={!paginaDoSite(p.url, site) || p.titulo.length < 3 || p.tema.length < 3} onCheckedChange={v => editarPagina(i, { aprovada: v === true, verificadaEm: v === true ? new Date().toISOString() : '' })} /><span>Confirmei a página e autorizo sugestões de ligação<span className="mt-1 block text-xs text-muted-foreground">O motor não verifica HTTP, noindex ou canonical nesta ronda.</span></span></label>
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={() => setC({ ...c, paginas: c.paginas.filter((_, j) => j !== i) })}>Retirar do inventário</Button>
        </div></details>)}
        <Button type="button" variant="outline" className="min-h-11 self-start" disabled={c.paginas.length >= 100} onClick={() => {const id=crypto.randomUUID();expandir(id,true);setC({ ...c, paginas: [...c.paginas, { id, titulo: '', url: '', tema: '', keyword: '', tipo: 'artigo', aprovada: false, verificadaEm: '' }] });}}>Adicionar página do site</Button>
      </section>
    </fieldset>
    <p role="status" className="text-xs text-muted-foreground">{sujo ? 'Alterações por guardar. Guarda antes de mudar de site ou separador.' : `Conhecimento guardado · revisão ${base.revista}`} · sem chamadas pagas</p>
  </form>;
}
