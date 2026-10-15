import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { chaveRecuperacao, guardarRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";
import { guardarComposicao, type ConteudoCompleto } from "@/services/conteudos";
import { assinaturaComposicao, comporCarrossel, comporStory, validarComposicao } from "../../../supabase/functions/_shared/conteudos/apresentacao";
import type { PecaDivulgacao } from "../../../supabase/functions/_shared/conteudos/divulgacao";
import type { PacoteProva } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { exportarCarrossel, exportarStory } from "./exportar";
import "@/features/motor/estudio.css";

export function CompositorDivulgacao({ dados, peca, aoFechar }: { dados: ConteudoCompleto; peca: PecaDivulgacao; aoFechar: () => void }) {
  const c = dados.conteudo, d = c.divulgacao!;
  const base = assinaturaComposicao(peca, c.fonte, c.carrossel, d.story);
  const guardada = d.composicoes?.[peca];
  const criar = () => peca === "story" ? comporStory(c.id, d.story, c.fonte.numero) : comporCarrossel(c.id, c.carrossel!, c.fonte);
  const [inicial, setInicial] = useState(() => guardada?.pacote ?? criar());
  const [geracao, setGeracao] = useState(0);
  const [baseDaComposicao, setBaseDaComposicao] = useState(guardada?.base_assinatura ?? base);
  const [pacote, setPacote] = useState(inicial);
  const [versao, setVersao] = useState(c.divulgacao_versao ?? 0);
  const [assinaturaGuardada, setAssinaturaGuardada] = useState(guardada ? JSON.stringify(inicial) : "");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"sair" | "recriar" | null>(null);
  const cabecalho = useRef<HTMLDivElement>(null);
  const [alturaEditor, setAlturaEditor] = useState<number>();
  const { user } = useAuth();
  const chave = user ? chaveRecuperacao(user.id, `composicao-newsletter-${peca}`, c.id, null) : null;
  const sujo = JSON.stringify(pacote) !== assinaturaGuardada;
  const atualRef = useRef(pacote); atualRef.current = pacote;
  const sujoRef = useRef(sujo); sujoRef.current = sujo;
  const origemMudou = baseDaComposicao !== base;

  useLayoutEffect(() => {
    if (!cabecalho.current || typeof ResizeObserver === "undefined") return;
    window.scrollTo(0, 0);
    const atualizar = () => setAlturaEditor(Math.max(360, (window.visualViewport?.height ?? window.innerHeight) - cabecalho.current!.getBoundingClientRect().bottom));
    const r = new ResizeObserver(atualizar); r.observe(cabecalho.current); atualizar();
    window.visualViewport?.addEventListener("resize", atualizar); window.addEventListener("resize", atualizar);
    return () => { r.disconnect(); window.visualViewport?.removeEventListener("resize", atualizar); window.removeEventListener("resize", atualizar); };
  }, []);

  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);
  useEffect(() => { if (sujo && chave) guardarRecuperacao(chave, pacote); }, [pacote, sujo, chave]);
  useEffect(() => () => { if (sujoRef.current && chave) guardarRecuperacao(chave, atualRef.current); }, [chave]);
  const alterar = useCallback((p: PacoteProva) => setPacote(p), []);
  const executar = async (f: () => Promise<void>) => {
    setOcupado(true); setErro(null);
    try { await f(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  const guardar = () => executar(async () => {
    const enviado = validarComposicao(pacote, peca, c.id);
    const assinatura = JSON.stringify(pacote);
    const r = await guardarComposicao(c.id, versao, peca, base, enviado);
    setVersao(r.divulgacao_versao); setAssinaturaGuardada(assinatura);
    if (JSON.stringify(atualRef.current) === assinatura && chave) limparRecuperacao(chave);
    toast.success("Composição guardada no Hub. A publicação continua manual.");
  });
  const fechar = () => {
    if (sujo) { setConfirmar("sair"); return; }
    aoFechar();
  };
  return <section className="mc-estudio flex min-w-0 flex-col" aria-label={`Compositor do ${peca}`}>
    <div ref={cabecalho} className="flex flex-col gap-2 border-b bg-background p-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" aria-label="Voltar à divulgação" onClick={fechar}><ArrowLeft data-icon="inline-start" /><span className="hidden sm:inline">Voltar à divulgação</span></Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={ocupado} onClick={() => executar(async () => {
            if (peca === "story") await exportarStory(d.story, c.fonte.numero, pacote);
            else await exportarCarrossel("zip", c.carrossel!, c.fonte, pacote);
          })} aria-label={peca === "story" ? "Descarregar Story" : "PNG (ZIP)"}><Download data-icon="inline-start" /><span className="hidden sm:inline">{peca === "story" ? "Descarregar Story" : "PNG (ZIP)"}</span></Button>
          {peca === "carrossel" && <Button variant="outline" disabled={ocupado} onClick={() => executar(() => exportarCarrossel("pdf", c.carrossel!, c.fonte, pacote))}><FileText data-icon="inline-start" />PDF</Button>}
          <Button aria-label="Guardar composição" disabled={ocupado || !sujo || origemMudou} onClick={guardar}>{ocupado ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}Guardar<span className="hidden sm:inline"> composição</span></Button>
        </div>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{sujo ? "Alterações visuais por guardar" : "Composição guardada no Hub"}<span className="hidden sm:inline"> · Edita texto, posição, cor e tamanho no compositor. O texto de origem é preservado.</span></p>
      {peca === "story" && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Ligação no Instagram</summary><p className="pt-2">Reserva o espaço livre abaixo do convite para o autocolante «Ligação» no Instagram. Usa a ligação guardada no Story.</p></details>}
      {origemMudou && <Alert><AlertTitle>O texto de origem mudou</AlertTitle><AlertDescription className="flex flex-col items-start gap-2">A composição guardada foi preservada. Exporta o JSON pelo menu do documento se quiseres conservar uma cópia.<Button variant="outline" onClick={() => setConfirmar("recriar")}>Recriar a partir do texto</Button></AlertDescription></Alert>}
      {erro && <Alert variant="destructive"><AlertTitle>Não foi possível concluir</AlertTitle><AlertDescription>{erro} A composição continua no editor.</AlertDescription></Alert>}
    </div>
    <EditorGrafico key={geracao} pacoteInicial={inicial} chaveLocal={chave} real titulo={`${peca === "story" ? "Story da crónica" : "Carrossel da newsletter"} · #${c.fonte.numero}`}
      direcaoPersonalizada="DIGITALSPRINT · Editorial" projectId={c.project_id ?? undefined} alturaDisponivel={alturaEditor} compactarPaginaUnica onAlterado={alterar} />
    <Dialog open={!!confirmar} onOpenChange={o => !o && setConfirmar(null)}><DialogContent><DialogHeader><DialogTitle>{confirmar === "sair" ? "Sair sem guardar a composição?" : "Recriar a composição?"}</DialogTitle><DialogDescription>{confirmar === "sair" ? "A composição guardada no Hub mantém-se. As alterações ficam numa cópia de recuperação neste dispositivo." : "A nova composição usa o texto de origem atual. Os ajustes visuais da cópia guardada só serão substituídos se guardares a nova composição."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmar(null)}>Continuar a editar</Button><Button onClick={() => { const acao = confirmar; setConfirmar(null); if (acao === "sair") aoFechar(); else { const p = criar(); setInicial(p); setPacote(p); setBaseDaComposicao(base); setGeracao(g => g + 1); } }}>{confirmar === "sair" ? "Sair e manter cópia local" : "Recriar composição"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
