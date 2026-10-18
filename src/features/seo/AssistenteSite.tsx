import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from '@/lib/recuperacaoLocal';
import { apiSeo } from './api';
import { dataSeo, usd } from './precos';
import type { SiteEditorial } from './contratos';
import { DIAS_SITE, PASSOS_SITE, definicaoFormulario, formularioSite, lerRascunhoSite, problemasDefinicao, ritmoDoSite, type DefinicaoSite, type FormularioSite } from './configuracaoSite';

interface Props { site: SiteEditorial; projetoId: string; podeEditar: boolean; aoGuardar: (site: SiteEditorial) => Promise<unknown> }
export function AssistenteSite({ site, projetoId, podeEditar, aoGuardar }: Props) {
  const { user } = useAuth(), [params, setParams] = useSearchParams();
  const passo = Math.min(5, Math.max(0, Math.floor(Number(params.get('passo'))) || 0));
  const [base, setBase] = useState(() => structuredClone(site)), [form, setForm] = useState(() => formularioSite(site));
  const chave = user ? chaveRecuperacao(user.id, 'configurar-site', site.id, projetoId) : null;
  const [recuperacao, setRecuperacao] = useState(() => chave && user ? lerRascunhoSite(lerRecuperacao(chave, user.id)?.dados) : null);
  const [busy, setBusy] = useState(false), [erro, setErro] = useState(''), [tentou, setTentou] = useState(false), [revisto, setRevisto] = useState(false);
  const [guardado, setGuardado] = useState<SiteEditorial | null>(null), [aviso, setAviso] = useState('');
  const ocupado = useRef(false), vivo = useRef(true), titulo = useRef<HTMLHeadingElement>(null), passoAtual = useRef<HTMLButtonElement>(null), painel = useRef<HTMLDivElement>(null), barraPassos = useRef<HTMLElement>(null), montou = useRef(false);
  const definicao = definicaoFormulario(form), problemas = problemasDefinicao(definicao, base);
  const sujo = JSON.stringify(form) !== JSON.stringify(formularioSite(base));
  const conflito = site.politica.revista !== base.politica.revista;
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useEffect(() => {
    if (!chave || !podeEditar || recuperacao || guardado || (!sujo && passo === 0)) return;
    guardarRecuperacao(chave, { siteId: base.id, revista: base.politica.revista, passo, form });
  }, [chave, base.id, base.politica.revista, form, passo, recuperacao, sujo, guardado, podeEditar]);
  useEffect(() => {
    if (!sujo || guardado) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [sujo, guardado]);
  useEffect(() => {
    if (montou.current) {
      const barra = barraPassos.current, atual = passoAtual.current, alvo = painel.current ?? titulo.current;
      if (barra && atual) {
        const b = barra.getBoundingClientRect(), a = atual.getBoundingClientRect();
        if (a.left < b.left) barra.scrollLeft += a.left - b.left;
        else if (a.right > b.right) barra.scrollLeft += a.right - b.right;
      }
      // Scroll the app's nearest scroll container only; scrollIntoView also moves
      // outer ancestors and can displace the sticky navigation in embedded previews.
      for (let p = alvo?.parentElement; p; p = p.parentElement) {
        if (p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY)) {
          const cabecalho = Math.max(0, (p.querySelector('.hub-header')?.getBoundingClientRect().bottom ?? p.getBoundingClientRect().top) - p.getBoundingClientRect().top);
          p.scrollTop = Math.max(0, p.scrollTop + (alvo?.getBoundingClientRect().top ?? 0) - p.getBoundingClientRect().top - cabecalho - 16);
          break;
        }
      }
    }
    montou.current = true; titulo.current?.focus({ preventScroll: true });
  }, [passo, guardado]);
  function ir(n: number) { setTentou(false); setErro(''); setParams(p => { const novo = new URLSearchParams(p); novo.set('passo', String(n)); return novo; }); }
  function editar<K extends keyof FormularioSite>(campo: K, valor: FormularioSite[K]) { setForm(f => ({ ...f, [campo]: valor })); setRevisto(false); }
  function mensagem(campo: string) { return tentou ? problemas.find(p => p.campo === campo)?.mensagem : undefined; }
  function continuar() {
    if (problemas.some(p => p.passo === passo)) { setTentou(true); return; }
    ir(Math.min(5, passo + 1));
  }
  function recuperar() {
    if (!recuperacao || recuperacao.siteId !== site.id) return;
    setForm(recuperacao.form); ir(recuperacao.passo); setRecuperacao(null); setRevisto(false);
    if (recuperacao.revista !== base.politica.revista) setAviso('O rascunho partiu de uma revisão anterior. Revê todos os passos antes de guardar sobre a configuração atual.');
  }
  function reabrir() {
    setBase(structuredClone(site)); setForm(formularioSite(site)); setRevisto(false); setErro(''); setTentou(false); setAviso('');
    if (chave && user) setRecuperacao(lerRascunhoSite(lerRecuperacao(chave, user.id)?.dados));
    ir(0);
  }
  async function guardar() {
    if (ocupado.current || !podeEditar || conflito || recuperacao || !revisto) return;
    if (problemas.length) { setTentou(true); return; }
    ocupado.current = true; setBusy(true); setErro('');
    const enviado = form;
    try {
      const s = await apiSeo<SiteEditorial>('configurar-site', { siteId: base.id, revista: base.politica.revista, definicao, confirmacao: true }, { projeto: projetoId });
      if (chave && user) { const r = lerRascunhoSite(lerRecuperacao(chave, user.id)?.dados); if (r && JSON.stringify(r.form) === JSON.stringify(enviado)) limparRecuperacao(chave); }
      if (!vivo.current) return;
      setBase(s); setForm(formularioSite(s)); setGuardado(s); setRecuperacao(null); setRevisto(false);
      try { await aoGuardar(s); } catch { if (vivo.current) setAviso('A configuração foi guardada. Não foi possível atualizar a lista; volta a abri-la para consultar o estado mais recente.'); }
    } catch (e) { if (vivo.current) setErro((e as Error).message); }
    finally { ocupado.current = false; if (vivo.current) setBusy(false); }
  }
  if (guardado) return <section aria-label="Configuração guardada" className="flex max-w-3xl flex-col gap-5 rounded-xl border bg-card p-5 sm:p-7"><CheckCircle2 className="size-7 text-primary" aria-hidden /><h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold outline-none">Configuração guardada</h2><p className="text-sm text-muted-foreground">{guardado.dominio} · revisão {guardado.politica.revista} · {dataSeo(guardado.configuracaoGuiada?.concluidaEm ?? '')}.</p><p className="max-w-prose text-sm leading-relaxed">{guardado.estado === 'planeado' ? 'O planeamento editorial está preparado. Este site continua a desenvolver mais tarde, sem automação ativa.' : guardado.politica.ativa ? 'As definições guardadas passam a ser usadas nos próximos ciclos desta política, dentro das autorizações existentes.' : 'O motor já pode usar estas definições quando preparares um artigo. A política deste site continua inativa.'}</p>{aviso && <p role="status" className="text-sm text-muted-foreground">{aviso}</p>}<div className="flex flex-wrap gap-3"><Button className="min-h-11" asChild><Link to={guardado.estado === 'planeado' ? '/artigos/sites' : `/artigos/plano?site=${encodeURIComponent(guardado.id)}&novo=1`}>{guardado.estado === 'planeado' ? 'Voltar aos sites' : 'Preparar artigo'}<ArrowRight className="size-4" aria-hidden /></Link></Button>{guardado.estado !== 'planeado' && <Button className="min-h-11" variant="outline" asChild><Link to="/artigos/sites">Voltar aos sites</Link></Button>}<Button className="min-h-11" variant="link" onClick={() => { setGuardado(null); ir(0); }}>Ajustar definições</Button></div><p className="text-xs text-muted-foreground">A ligação WordPress e a publicação de artigos têm verificações próprias.</p></section>;

  return <div ref={painel} className="grid min-w-0 items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
    <nav ref={barraPassos} aria-label="Passos da configuração" className="min-w-0 overflow-x-auto pb-2 lg:overflow-visible"><ol className="flex w-max min-w-max gap-1 lg:w-auto lg:min-w-0 lg:flex-col">{PASSOS_SITE.map((nome, i) => <li key={nome} className="shrink-0"><button ref={i === passo ? passoAtual : undefined} type="button" disabled={busy} aria-current={i === passo ? 'step' : undefined} className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${passo === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} onClick={() => ir(i)}><span className="tabular-nums">{i + 1}</span>{nome}</button></li>)}</ol></nav>
    <form noValidate onSubmit={e => { e.preventDefault(); if (passo === 5) void guardar(); else continuar(); }} className="flex min-w-0 max-w-4xl flex-col gap-5 rounded-xl border bg-card p-5 sm:p-7">
      <header><p className="mb-2 text-sm text-muted-foreground">Passo {passo + 1} de {PASSOS_SITE.length}</p><h2 ref={titulo} tabIndex={-1} className="scroll-mt-40 text-2xl font-semibold tracking-tight outline-none">{PASSOS_SITE[passo]}</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{['Define quem queres ajudar e o que o conteúdo deve conseguir.', 'Descreve como o site fala com o leitor, com exemplos e limites claros.', 'Escolhe os assuntos deste site e os que merecem revisão especial.', 'Explica o que ofereces e qual é o próximo passo útil para o leitor.', 'Define um ritmo sustentável e quem decide quando o artigo pode sair.', 'Confirma o que o motor vai usar antes de guardar as definições.'][passo]}</p></header>
      {!podeEditar && <Alert><AlertDescription>Podes consultar as definições. É necessária permissão de edição para as alterar ou guardar.</AlertDescription></Alert>}
      {recuperacao && <Alert><AlertTitle>Há alterações por concluir neste navegador</AlertTitle><AlertDescription><p>Escolhe se queres continuar esse rascunho ou começar com a versão guardada no Hub.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" className="min-h-11" variant="outline" disabled={busy || !podeEditar} onClick={recuperar}>Continuar o rascunho</Button><Button type="button" className="min-h-11" variant="ghost" disabled={busy} onClick={() => { if (chave) limparRecuperacao(chave); setRecuperacao(null); }}>Usar versão guardada</Button></div></AlertDescription></Alert>}
      {conflito && <Alert variant="destructive"><AlertTitle>Este site mudou noutro separador</AlertTitle><AlertDescription><p>As tuas alterações continuam no formulário e na recuperação local. Reabre a versão guardada antes de voltar a editar.</p><Button type="button" className="mt-3 min-h-11" variant="outline" disabled={busy} onClick={reabrir}>Reabrir configuração guardada</Button></AlertDescription></Alert>}
      {aviso && <p role="status" className="text-sm text-muted-foreground">{aviso}</p>}
      <fieldset disabled={busy || !podeEditar || !!recuperacao || conflito} className="flex min-w-0 flex-col gap-5">
        {passo === 0 && <><CampoArea id="site-publico" nome="Para quem escreves?" valor={form.publico} mudar={v => editar('publico', v)} dica="Perfis, necessidades e nível de conhecimento. Por exemplo: gestores de pequenas empresas que precisam de automatizar processos." erro={mensagem('publico')} /><CampoArea id="site-objetivo" nome="O que queres alcançar com o conteúdo?" valor={form.objetivo} mudar={v => editar('objetivo', v)} dica="Define uma prioridade: tráfego orgânico, procura por formação ou pedidos de proposta. Evita promessas de resultados." erro={mensagem('objetivo')} /></>}
        {passo === 1 && <CampoArea id="site-voz" nome="Como deve soar este site?" valor={form.voz} mudar={v => editar('voz', v)} dica="Idioma, forma de tratar o leitor, tom e exemplos permitidos. Experiências pessoais e resultados só podem ser usados quando forem fornecidos e aprovados." erro={mensagem('voz')} rows={6} />}
        {passo === 2 && <><CampoArea id="site-temas" nome="Temas a trabalhar" valor={form.temas} mudar={v => editar('temas', v)} dica="Um tema por linha, até 30. O motor usa-os para escolher pautas adequadas à marca." erro={mensagem('temasPermitidos')} rows={5} maxLength={10000} /><CampoArea id="site-excluidos" nome="Temas que precisam de revisão especial" valor={form.excluidos} mudar={v => editar('excluidos', v)} dica="Um por linha. Estes temas exigem revisão humana, mesmo com publicação automática. Podes deixar vazio." erro={mensagem('temasExcluidos')} rows={3} maxLength={10000} /></>}
        {passo === 3 && <CampoArea id="site-oferta" nome="Que oferta deve o conteúdo apoiar?" valor={form.oferta} mudar={v => editar('oferta', v)} dica="Serviços, formações ou recursos reais e o próximo passo do leitor. Indica o que ainda precisa de confirmação; não inventes preços, vagas ou condições." erro={mensagem('oferta')} rows={6} />}
        {passo === 4 && <>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="site-frequencia">Artigos por semana</Label><select id="site-frequencia" className={CLASSE_SELECT} value={form.limiteSemanal} onChange={e => editar('limiteSemanal', Number(e.target.value))}>{Array.from({ length: 7 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? 'artigos' : 'artigo'}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="site-hora">Hora de preparação · Lisboa</Label><Input id="site-hora" className="min-h-11" type="time" value={form.hora} aria-invalid={!!mensagem('hora')} aria-describedby={mensagem('hora') ? 'site-hora-erro' : undefined} onChange={e => editar('hora', e.target.value)} />{mensagem('hora') && <p id="site-hora-erro" className="text-sm text-destructive">{mensagem('hora')}</p>}</div></div>
          <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-sm font-medium">Em que dias?</legend><div className="flex flex-wrap gap-2">{DIAS_SITE.map(d => <button key={d.n} type="button" className={`min-h-11 rounded-md border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.dias.includes(d.n) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`} aria-label={d.nome} aria-pressed={form.dias.includes(d.n)} onClick={() => editar('dias', form.dias.includes(d.n) ? form.dias.filter(n => n !== d.n) : [...form.dias, d.n])}>{d.curto}</button>)}</div><p className="text-xs text-muted-foreground">{form.dias.length} de {form.limiteSemanal} dias escolhidos. O ritmo é um limite de preparação; a publicação depende da revisão e da ligação ao site.</p>{mensagem('dias') && <p role="alert" className="text-sm text-destructive">{mensagem('dias')}</p>}</fieldset>
          <div className="flex flex-col gap-2"><Label htmlFor="site-producao">Quando preparar os textos?</Label><select id="site-producao" className={CLASSE_SELECT} disabled={base.estado === 'planeado'} value={form.producao} onChange={e => editar('producao', e.target.value as DefinicaoSite['producao'])}><option value="manual">Só quando eu pedir</option><option value="automatica">Seguir este ritmo automaticamente</option></select>{base.estado === 'planeado' && <p className="text-xs text-muted-foreground">Site planeado: podes preparar as definições, mas a automação fica indisponível.</p>}{mensagem('producao') && <p role="alert" className="text-sm text-destructive">{mensagem('producao')}</p>}</div>
          {base.revisaoObrigatoria ? <div className="flex flex-col gap-2"><p className="text-sm font-medium">Quem aprova a publicação?</p><p className="flex min-h-11 items-center gap-2 rounded-md border p-3 text-sm"><LockKeyhole className="size-4 shrink-0" aria-hidden />Aprovação humana obrigatória</p><p className="text-xs text-muted-foreground">Cada versão do artigo precisa de validação antes da publicação neste site.</p></div> : <div className="flex flex-col gap-2"><Label htmlFor="site-aprovacao">Quem aprova a publicação?</Label><select id="site-aprovacao" className={CLASSE_SELECT} disabled={base.estado === 'planeado'} value={form.publicacao} onChange={e => editar('publicacao', e.target.value as DefinicaoSite['publicacao'])}><option value="humana">Escreve e eu aprovo cada artigo</option><option value="automatica">Publicar automaticamente após os controlos</option></select><p className="text-xs text-muted-foreground">A publicação automática continua sujeita à qualidade, fontes, temas sensíveis, orçamento e autorizações do motor.</p></div>}
          <p className="rounded-lg bg-muted p-4 text-sm leading-relaxed">Guardar o ritmo e as regras não ativa uma política que esteja inativa. A ativação e os limites estão na área de Automação.</p>
        </>}
        {passo === 5 && <><ResumoSite definicao={definicao} editar={ir} /><div className="border-t pt-4"><p className="text-sm font-medium">Como ficam as autorizações?</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{base.estado === 'planeado' ? 'Este site continua planeado, sem produção ou publicação automática.' : base.politica.ativa ? 'Esta política já está ativa. As alterações passam a valer nos próximos ciclos autorizados, dentro das pausas e limites existentes.' : 'A política deste site continua inativa. Podes preparar artigos por pedido e rever a ativação mais tarde.'}</p><p className="mt-2 text-xs text-muted-foreground">Mantém-se o limite atual de {usd(base.politica.mensalMicro)}/mês neste site. A ligação WordPress é verificada separadamente. Alterar estas definições exige nova revisão dos artigos anteriormente aprovados.</p></div><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox className="mt-1" checked={revisto} onCheckedChange={v => setRevisto(v === true)} /><span>Revi estas definições e autorizo a sua utilização em {base.dominio}.</span></label></>}
      </fieldset>
      {tentou && passo === 5 && problemas.length > 0 && <Alert variant="destructive"><AlertTitle>Há definições por completar</AlertTitle><AlertDescription><ul className="list-disc pl-4">{problemas.map((p, i) => <li key={i}><button type="button" className="min-h-11 text-left underline underline-offset-4" onClick={() => ir(p.passo)}>{p.mensagem}</button></li>)}</ul></AlertDescription></Alert>}
      {erro && <Alert variant="destructive"><AlertTitle>Não foi possível guardar</AlertTitle><AlertDescription>{erro} O formulário foi preservado.</AlertDescription></Alert>}
      <footer className="flex flex-col gap-4 border-t pt-4"><p className="text-xs text-muted-foreground">{sujo || !base.configuracaoGuiada ? 'Estas definições só ficam guardadas no Hub no último passo.' : `Versão guardada · revisão ${base.politica.revista}`} · Nenhum pedido pago é feito por este assistente.</p><div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" className="min-h-11" disabled={busy || passo === 0} onClick={() => ir(passo - 1)}><ArrowLeft className="size-4" aria-hidden />Voltar</Button>{passo < 5 ? <Button type="submit" className="min-h-11" disabled={busy || !!recuperacao || conflito}>Continuar<ArrowRight className="size-4" aria-hidden /></Button> : <Button type="submit" className="min-h-11" disabled={busy || !revisto || !podeEditar || conflito || !!recuperacao}>{busy ? 'A guardar…' : base.estado === 'planeado' ? 'Guardar planeamento' : 'Guardar definições do site'}</Button>}</div></footer>
    </form>
  </div>;
}
const CLASSE_SELECT = 'min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
function CampoArea({ id, nome, valor, mudar, dica, erro, rows = 4, maxLength = 6000 }: { id: string; nome: string; valor: string; mudar: (s: string) => void; dica: string; erro?: string; rows?: number; maxLength?: number }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={id}>{nome}</Label><Textarea id={id} value={valor} onChange={e => mudar(e.target.value)} rows={rows} maxLength={maxLength} aria-invalid={!!erro} aria-describedby={`${id}-dica${erro ? ` ${id}-erro` : ''}`} /><p id={`${id}-dica`} className="max-w-prose text-xs leading-relaxed text-muted-foreground">{dica}</p>{erro && <p id={`${id}-erro`} className="text-sm text-destructive">{erro}</p>}</div>;
}
function ResumoSite({ definicao: d, editar }: { definicao: DefinicaoSite; editar: (passo: number) => void }) {
  const linhas = [{ nome: 'Público', valor: d.publico, passo: 0 }, { nome: 'Objetivo', valor: d.objetivo, passo: 0 }, { nome: 'Voz', valor: d.voz, passo: 1 }, { nome: 'Temas', valor: d.temasPermitidos.join(' · ') || 'Por definir', passo: 2 }, { nome: 'Revisão especial', valor: d.temasExcluidos.join(' · ') || 'Sem temas adicionais', passo: 2 }, { nome: 'Oferta', valor: d.oferta, passo: 3 }, { nome: 'Ritmo', valor: ritmoDoSite(d), passo: 4 }, { nome: 'Preparação', valor: d.producao === 'manual' ? 'Só quando eu pedir' : 'Segundo o ritmo definido, quando a política estiver ativa', passo: 4 }, { nome: 'Publicação', valor: d.publicacao === 'humana' ? 'Aprovação humana de cada artigo' : 'Automática após os controlos e autorizações', passo: 4 }];
  return <dl className="divide-y">{linhas.map(l => <div key={l.nome} className="flex min-w-0 items-start justify-between gap-4 py-4 first:pt-0"><div className="min-w-0"><dt className="text-sm font-medium">{l.nome}</dt><dd className="mt-2 max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{l.valor}</dd></div><Button type="button" className="min-h-11 shrink-0" variant="link" aria-label={`Editar ${l.nome.toLocaleLowerCase('pt-PT')}`} onClick={() => editar(l.passo)}>Editar</Button></div>)}</dl>;
}
