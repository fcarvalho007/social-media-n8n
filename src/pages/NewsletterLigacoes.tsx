import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, RefreshCw, Search, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SincronizacaoTokens } from "@/components/newsletter/SincronizacaoTokens";
import { UltimasEntradas } from "@/components/newsletter/UltimasEntradas";

interface Estado {
  endereco_publico: string | null;
  tag_token_egoi: string | null;
  automatismos_activos: boolean;
  segredos: Record<string, boolean>;
  validacoes?: Record<string, { validado: boolean; detalhe: string }>;
  listas_token?: Array<{ id: string; nome: string; campo: number | null; origem: "lista" | "legado" | null; campo_nome: string | null }>;
  endpoints: { email_entrada: string; egoi_cancelamentos: string; um_clique: string; sitemap: string; automatismos: string[] };
}

interface CampoLista { id: number; nome: string; formato: string; texto: boolean; dedicado: boolean }
interface CamposEgoi {
  ok: boolean;
  problema?: string;
  listas?: Array<{ id: string; nome: string; campo_atual: number | null; erro?: string; campos: CampoLista[] }>;
}

type Nivel = "falta" | "configurado" | "validado";
interface Servico { nome: string; uso: string; chaves: string[]; validacao?: string; acao: string }
interface Seccao { titulo: string; descricao: string; obrigatoria: boolean; servicos: Servico[] }

const SECCOES: Seccao[] = [
  {
    titulo: "Produção de conteúdo", obrigatoria: true,
    descricao: "Necessário para criar carrosséis e textos com IA.",
    servicos: [
      { nome: "IA de texto (DeepSeek · deepseek-flash)", uso: "Carrosséis, assistentes do «Criar» e textos da newsletter", chaves: ["DEEPSEEK_API_KEY"], validacao: "deepseek", acao: "Cria uma chave na conta DeepSeek e guarda-a nos segredos do projeto." },
    ],
  },
  {
    titulo: "Envio da newsletter", obrigatoria: true,
    descricao: "Sem isto não há envios reais. Os bloqueios ficam ativos até tudo estar validado.",
    servicos: [
      { nome: "Endereço público", uso: "Base de todos os links (newsletter e avisos sociais)", chaves: ["NL_PUBLIC_BASE_URL"], acao: "Define o endereço público onde a app está publicada." },
      { nome: "E-goi", uso: "Envio e confirmação de entrega", chaves: ["EGOI_API_KEY"], validacao: "egoi_tokens", acao: "Copia a chave da API da conta E-goi para os segredos do projeto." },
      { nome: "Ligações de subscrição", uso: "Assinatura dos links de cancelar/gerir", chaves: ["SUBSCRICAO_SEGREDO"], acao: "Não alterar: trocar invalida links já enviados." },
      { nome: "Avisos de cancelamento da E-goi", uso: "Receber cancelamentos feitos na E-goi", chaves: ["NL_EGOI_WEBHOOK_CHAVE"], acao: "Cria um valor aleatório, guarda-o no servidor e configura o mesmo valor no webhook da E-goi." },
    ],
  },
  {
    titulo: "Publicação social", obrigatoria: true,
    descricao: "Necessário para publicar e agendar no Painel social.",
    servicos: [
      { nome: "Getlate", uso: "Publicação no Instagram, LinkedIn e outras redes", chaves: ["GETLATE_API_TOKEN"], acao: "Copia o token da conta Getlate para os segredos do projeto." },
      { nome: "Resend", uso: "Emails de lembrete e de falha de publicação", chaves: ["RESEND_API_KEY"], acao: "Cria uma chave na conta Resend." },
    ],
  },
  {
    titulo: "Integrações opcionais", obrigatoria: false,
    descricao: "A app funciona sem estas; só ativam funções extra.",
    servicos: [
      { nome: "Fal", uso: "Geração de imagens com IA", chaves: ["FAL_KEY"], acao: "Cria uma chave na conta Fal." },
      { nome: "Kie (Seedream 5 Flash)", uso: "Imagens limpas para o editor de carrosséis", chaves: ["KIE_API_KEY"], validacao: "kie", acao: "Cria uma chave em kie.ai e guarda-a nos segredos do projeto com o nome KIE_API_KEY." },
      { nome: "Pexels", uso: "Sugestão de imagens", chaves: ["PEXELS_API_KEY"], acao: "Cria uma chave gratuita na Pexels." },
      { nome: "WordPress · site da newsletter", uso: "Edição web", chaves: ["WORDPRESS_SITE_URL", "WORDPRESS_APP_USER", "WORDPRESS_APP_PASSWORD"], acao: "Usa uma senha de aplicação do WordPress. Também são aceites wordpress_site_username e wordpress_site_key, com WORDPRESS_SITE_URL." },
      { nome: "WordPress · artigo da crónica", uso: "Rascunho no site pessoal (nunca publicado)", chaves: ["FREDERICO_WP_URL", "FREDERICO_WP_USER", "FREDERICO_WP_APP_PASSWORD"], acao: "Cria uma password de aplicação no WordPress." },
      { nome: "CloudMailin", uso: "Entrada de emails para curadoria", chaves: ["CLOUDMAILIN_AUTH_USER", "CLOUDMAILIN_AUTH_PASS"], acao: "Define utilizador e password no CloudMailin e no servidor." },
      { nome: "Automatismos", uso: "Chave dos processos agendados da newsletter", chaves: ["NL_CRON_SEGREDO"], acao: "Gerada no servidor." },
    ],
  },
];

const ROTULO: Record<Nivel, string> = { falta: "Em falta", configurado: "Presente · não validado", validado: "Validado" };

function Icone({ n, obrigatoria }: { n: Nivel; obrigatoria: boolean }) {
  if (n === "validado") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
  if (n === "configurado") return <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
  return <XCircle className={obrigatoria ? "h-4 w-4 shrink-0 text-destructive" : "h-4 w-4 shrink-0 text-muted-foreground"} aria-hidden />;
}

/** Admin checklist of external services: presence and recorded validation only, never values. */
export default function NewsletterLigacoes() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<{ tipo: "permissao" | "rede"; msg: string } | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [campos, setCampos] = useState<CamposEgoi | null>(null);
  const [aProcurar, setAProcurar] = useState(false);
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [aGuardar, setAGuardar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setACarregar(true); setErro(null);
    const { data, error } = await supabase.functions.invoke("nl-hooks/estado", { method: "GET" });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      setErro(status === 401 || status === 403
        ? { tipo: "permissao", msg: "Só os administradores podem ver esta página." }
        : { tipo: "rede", msg: "Não foi possível contactar o servidor." });
    } else setEstado(data as Estado);
    setACarregar(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const procurarCampos = async () => {
    setAProcurar(true);
    const { data, error } = await supabase.functions.invoke("nl-hooks/campos-egoi", { method: "GET" });
    setCampos(error ? { ok: false, problema: "Não foi possível ler os campos na E-goi." } : (data as CamposEgoi));
    setAProcurar(false);
  };

  const guardarCampo = async (listaId: string, campo: number | null) => {
    setAGuardar(listaId);
    const { data, error } = await supabase.functions.invoke("nl-hooks/campo-token-lista", { body: { lista_id: listaId, campo_id: campo, confirmar: "configurar-campo-token" } });
    setAGuardar(null);
    if (error) {
      const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null;
      toast.error(corpo?.error ?? "Não foi possível guardar o campo.");
      return;
    }
    toast.success(campo ? `Campo ${(data as { nome?: string }).nome ?? campo} guardado.` : "Campo removido.");
    await Promise.all([carregar(), procurarCampos()]);
  };

  if (aCarregar && !estado) return <div className="mx-auto max-w-3xl space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (erro && !estado) return (
    <div className="mx-auto max-w-xl p-4">
      <Alert variant={erro.tipo === "rede" ? "destructive" : "default"}>
        <AlertTitle>{erro.tipo === "rede" ? "Erro de ligação" : "Sem permissão"}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{erro.msg}</p>
          {erro.tipo === "rede" && <Button size="sm" variant="outline" onClick={carregar}><RefreshCw className="mr-1 h-4 w-4" />Tentar de novo</Button>}
        </AlertDescription>
      </Alert>
    </div>
  );
  if (!estado) return null;

  const nivel = (s: Servico): Nivel => {
    if (!s.chaves.every((k) => estado.segredos[k])) return "falta";
    return s.validacao && estado.validacoes?.[s.validacao]?.validado ? "validado" : "configurado";
  };
  const bloqueios = SECCOES.filter((x) => x.obrigatoria).flatMap((x) => x.servicos.filter((s) => nivel(s) === "falta").map((s) => ({ ...s, area: x.titulo })));
  const listasToken = estado.listas_token ?? [];
  const listasSemCampo = listasToken.filter((l) => !l.campo);
  const egoiSemCampo = listasSemCampo.length > 0;
  for (const l of listasSemCampo) bloqueios.push({ nome: `Lista «${l.nome}»`, uso: "", chaves: [], acao: "Falta o campo do token. Cria-o na E-goi e escolhe-o abaixo.", area: "Envio da newsletter" });

  return (
    <div className="w-full min-w-0 max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Ligações</h1>
          <p className="text-sm text-muted-foreground">Mostra se cada serviço tem as chaves no servidor, nunca os valores. Presente não significa válido: «Validado» só aparece com prova registada.</p>
        </div>
        <Button size="sm" variant="outline" onClick={carregar} disabled={aCarregar}><RefreshCw className="mr-1 h-4 w-4" />Atualizar</Button>
      </div>

      {bloqueios.length > 0 ? (
        <Alert variant="destructive" className="border-aviso-borda text-aviso-texto">
          <AlertTitle>{bloqueios.length === 1 ? "1 bloqueio obrigatório" : `${bloqueios.length} bloqueios obrigatórios`}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-sm">
              {bloqueios.map((b) => <li key={b.nome}><span className="font-medium">{b.area} · {b.nome}:</span> {b.acao}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert><AlertTitle>Sem chaves obrigatórias em falta</AlertTitle><AlertDescription>Ainda assim, só os serviços marcados «Validado» foram confirmados.</AlertDescription></Alert>
      )}

      {SECCOES.map((sec) => (
        <section key={sec.titulo} className="rounded-md border" aria-labelledby={`sec-${sec.titulo}`}>
          <header className="border-b p-3">
            <h2 id={`sec-${sec.titulo}`} className="text-sm font-semibold">{sec.titulo}{!sec.obrigatoria && <span className="ml-2 text-xs font-normal text-muted-foreground">Opcional</span>}</h2>
            <p className="text-xs text-muted-foreground">{sec.descricao}</p>
          </header>
          <ul className="divide-y">
            {sec.servicos.map((s) => {
              const n = nivel(s);
              const faltam = s.chaves.filter((k) => !estado.segredos[k]);
              const det = s.validacao ? estado.validacoes?.[s.validacao]?.detalhe : undefined;
              return (
                <li key={s.nome} className="flex items-start gap-3 p-3 text-sm">
                  <Icone n={n} obrigatoria={sec.obrigatoria} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{s.nome}</span><span className="text-xs text-muted-foreground">{ROTULO[n]}</span></div>
                    <div className="text-xs text-muted-foreground">{s.uso}</div>
                    {det && n !== "falta" && <div className="text-xs text-muted-foreground">{det}</div>}
                    {faltam.length > 0 && (
                      <details className="mt-1 text-xs">
                        <summary className={sec.obrigatoria ? "cursor-pointer text-aviso-texto" : "cursor-pointer text-muted-foreground"}>Como resolver</summary>
                        <p className="mt-1 text-muted-foreground">{s.acao}</p>
                        <p className="mt-1 break-all text-muted-foreground">Nome no servidor: {faltam.join(", ")}</p>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {sec.titulo === "Envio da newsletter" && (
            <div className="space-y-2 border-t p-3 text-sm">
              <p className="text-xs text-muted-foreground">{estado.automatismos_activos ? "Automatismos da newsletter ativos." : "Automatismos da newsletter inativos (ligam-se depois de validar a E-goi)."}</p>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Campo do token por lista</h3>
                <p className="text-xs text-muted-foreground">Cada lista da E-goi atribui os seus próprios números aos campos, por isso cada lista tem o seu campo. Uma lista sem campo fica bloqueada para envio real.</p>
                <ul className="divide-y rounded-md border">
                  {listasToken.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 text-xs">
                      <span className="font-medium">{l.nome}</span>
                      {l.campo
                        ? <span>Campo {l.campo}{l.campo_nome ? ` · ${l.campo_nome}` : ""}{l.origem === "legado" ? " · configuração antiga, confirmada na verificação" : ""}</span>
                        : <span className="text-aviso-texto">Sem campo: bloqueada</span>}
                    </li>
                  ))}
                  {listasToken.length === 0 && <li className="p-2 text-xs text-muted-foreground">Sem listas reais ativas.</li>}
                </ul>
                {egoiSemCampo && (
                  <details className="text-xs" open>
                    <summary className="cursor-pointer font-medium">Como criar o campo na E-goi</summary>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">
                      <li>Na E-goi, abre cada lista sem campo e cria um campo extra novo, de texto, com um nome que contenha «token» (por exemplo «token_subscricao»).</li>
                      <li>Não reutilizes campos que já guardam dados dos contactos.</li>
                      <li>Volta aqui, carrega em «Procurar campos na E-goi» e escolhe esse campo para cada lista.</li>
                    </ol>
                  </details>
                )}
              </div>
              {estado.segredos.EGOI_API_KEY && (
                <div className="space-y-2">
                  <Button size="sm" variant={egoiSemCampo ? "default" : "outline"} onClick={procurarCampos} disabled={aProcurar}>
                    <Search className="mr-1 h-4 w-4" />{aProcurar ? "A ler a E-goi…" : "Procurar campos na E-goi"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Só leitura: não cria campos, não altera contactos e não envia emails.</p>
                  {campos && !campos.ok && <p role="alert" className="text-xs text-aviso-texto">{campos.problema}</p>}
                  {campos?.ok && campos.listas?.map((l) => {
                    const dedicados = l.campos.filter((c) => c.dedicado);
                    const sel = escolha[l.id] ?? "";
                    return (
                      <div key={l.id} className="space-y-1 rounded-md border p-2 text-xs">
                        <p className="font-medium">{l.nome}</p>
                        {l.erro ? <p className="text-aviso-texto">Não foi possível ler esta lista: {l.erro}</p>
                          : dedicados.length === 0
                            ? <p className="text-aviso-texto">Nenhum campo de texto dedicado ao token nesta lista ({l.campos.length} campos extra, nenhum com «token» no nome). Cria-o na E-goi primeiro.</p>
                            : (
                              <div className="flex flex-wrap items-center gap-2">
                                <Label htmlFor={`campo-${l.id}`} className="sr-only">Campo do token de {l.nome}</Label>
                                <select id={`campo-${l.id}`} className="h-9 rounded-md border border-input bg-background px-2" value={sel} onChange={(e) => setEscolha((x) => ({ ...x, [l.id]: e.target.value }))}>
                                  <option value="">Escolhe o campo</option>
                                  {dedicados.map((c) => <option key={c.id} value={c.id}>{c.nome} (#{c.id})</option>)}
                                </select>
                                <Button size="sm" disabled={!sel || aGuardar === l.id} onClick={() => guardarCampo(l.id, Number(sel))}>{aGuardar === l.id ? "A guardar…" : "Guardar"}</Button>
                              </div>
                            )}
                        {l.campo_atual && <Button size="sm" variant="ghost" disabled={aGuardar === l.id} onClick={() => guardarCampo(l.id, null)}>Remover campo atual ({l.campo_atual})</Button>}
                        {!l.erro && (
                          <details>
                            <summary className="cursor-pointer text-muted-foreground">Todos os campos extra ({l.campos.length})</summary>
                            <ul className="mt-1 space-y-0.5 text-muted-foreground">{l.campos.map((c) => <li key={c.id}>#{c.id} · {c.nome} · {c.formato}{c.dedicado ? " · dedicado ao token" : ""}</li>)}</ul>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      ))}

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Endereços técnicos</summary>
        <div className="mt-2 space-y-2">
          <p>Endereço público: {estado.endereco_publico ? <code className="break-all">{estado.endereco_publico}</code> : <span className="text-aviso-texto">por configurar</span>}</p>
          <p>Campo do token nos emails: {estado.tag_token_egoi ?? <span className="text-aviso-texto">por configurar</span>}</p>
          <p><span className="text-muted-foreground">CloudMailin:</span><br /><code className="break-all">{estado.endpoints.email_entrada}</code></p>
          <p><span className="text-muted-foreground">Aviso de cancelamentos na E-goi (substitui o marcador pela chave guardada no servidor):</span><br /><code className="break-all">{estado.endpoints.egoi_cancelamentos}</code></p>
          <p><span className="text-muted-foreground">Mapa do site:</span><br /><code className="break-all">{estado.endpoints.sitemap}</code></p>
        </div>
      </details>

      <SincronizacaoTokens />

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Registo de entradas</summary>
        <div className="mt-2"><UltimasEntradas /></div>
      </details>
    </div>
  );
}
