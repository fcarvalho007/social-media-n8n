import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Link as LinkIcon, Loader2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { guardarStory, prepararDivulgacao, type DivulgacaoEdicao, type StoryEdicao, type FonteCronica } from "@/services/conteudos";
import { validarStory, LIMITES_STORY } from "../../../supabase/functions/_shared/conteudos/divulgacao";
import { desenharStory, exportarStory } from "./exportar";

const apiReal = { preparar: prepararDivulgacao, guardar: guardarStory };

export function DivulgacaoEditor({ id, fonte, inicial, versaoInicial = 0, onActualizar, onAlterado, children, api = apiReal }: {
  id: string; fonte: FonteCronica; inicial?: DivulgacaoEdicao | null; versaoInicial?: number;
  onActualizar: () => void; onAlterado: (sujo: boolean) => void; children: ReactNode; api?: typeof apiReal;
}) {
  const [dados, setDados] = useState(inicial ?? null);
  const [story, setStory] = useState<StoryEdicao | null>(inicial?.story ?? null);
  const [versao, setVersao] = useState(versaoInicial);
  const [tab, setTab] = useState("story");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [recuperada, setRecuperada] = useState<StoryEdicao | null>(null);
  const [copiado, setCopiado] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const chave = user ? chaveRecuperacao(user.id, "story-newsletter", id, null) : null;
  const sujo = JSON.stringify(story) !== JSON.stringify(dados?.story ?? null);

  useEffect(() => {
    if (sujo) return;
    setDados(inicial ?? null); setStory(inicial?.story ?? null); setVersao(versaoInicial);
  }, [inicial, versaoInicial]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onAlterado(sujo); return () => onAlterado(false); }, [sujo, onAlterado]);
  useEffect(() => {
    if (sujo && chave && story) guardarRecuperacao(chave, story);
  }, [sujo, chave, story]);
  useEffect(() => {
    if (!chave || !user || !inicial) return;
    const r = lerRecuperacao<StoryEdicao>(chave, user.id);
    if (r && JSON.stringify(r.dados) !== JSON.stringify(inicial.story)) setRecuperada(r.dados);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar); return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);
  useEffect(() => {
    let activo = true;
    if (canvas.current && story && tab === "story") {
      const c = document.createElement("canvas");
      desenharStory(c, story, fonte.numero).then(() => {
        if (!activo || !canvas.current) return;
        canvas.current.width = c.width; canvas.current.height = c.height;
        canvas.current.getContext("2d")?.drawImage(c, 0, 0);
        setErroPreview(null);
      }).catch((e: Error) => activo && setErroPreview(e.message));
    }
    return () => { activo = false; };
  }, [story, tab, fonte.numero]);

  const executar = async (f: () => Promise<void>) => {
    setErro(null); setOcupado(true);
    try { await f(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  const guardar = (estado: "rascunho" | "revisto") => executar(async () => {
    if (!story) return;
    const r = await api.guardar(id, versao, validarStory(story), estado);
    setDados(r.divulgacao); setStory(r.divulgacao.story); setVersao(r.divulgacao_versao);
    if (chave) limparRecuperacao(chave);
    toast.success(estado === "revisto" ? "Story revisto. A publicação continua manual." : "Story guardado no Hub.");
  });
  const editar = (campo: keyof StoryEdicao, valor: string) => { if (story) { setStory({ ...story, [campo]: valor }); setCopiado(false); } };

  return <section className="flex flex-col gap-5" aria-label="Plano de divulgação da newsletter">
    <div className="flex flex-col gap-2 border-b pb-5">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Do envio à divulgação</h2><Badge variant="secondary">Rascunhos no Hub</Badge></div>
      <p className="max-w-prose text-sm text-muted-foreground">Duas peças com objetivos diferentes: levar à crónica no dia do envio e dar uma nova razão para ler a edição no dia seguinte. Sem IA paga; revê antes de publicar.</p>
      {fonte.teste && <p className="text-sm text-muted-foreground">Este é um ensaio. O envio interno não ativa a divulgação real nem define datas de publicação.</p>}
    </div>
    {!dados && <div className="flex flex-col items-start gap-3">
      <p className="text-sm">Prepara o Story e o carrossel dos destaques a partir desta fonte. Um carrossel já guardado é preservado.</p>
      <Button disabled={ocupado} onClick={() => executar(async () => { await api.preparar(id); onActualizar(); })}>{ocupado && <Loader2 className="mr-2 size-4 animate-spin" />}Preparar duas peças · sem IA</Button>
    </div>}
    {erro && <Alert variant="destructive"><AlertTitle>Não foi possível concluir</AlertTitle><AlertDescription>{erro}</AlertDescription></Alert>}
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <TabsList aria-label="Peças de divulgação" className="h-auto w-full justify-start gap-1 bg-muted p-1 sm:w-fit">
        <TabsTrigger value="story" className="min-h-12 flex-1 whitespace-normal text-left sm:flex-none">Dia do envio · Story</TabsTrigger>
        <TabsTrigger value="carrossel" className="min-h-12 flex-1 whitespace-normal text-left sm:flex-none">Dia seguinte · Carrossel</TabsTrigger>
      </TabsList>
      <TabsContent value="story" forceMount className="mt-0 data-[state=inactive]:hidden">
        {story && <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
          <figure className="flex flex-col gap-2">
            <canvas ref={canvas} className={`mx-auto w-full max-w-[360px] rounded-xl border ${erroPreview ? "hidden" : ""}`} aria-label={`Story da crónica da edição ${fonte.numero}`} />
            {erroPreview && <p role="alert" className="text-sm text-destructive">{erroPreview}</p>}
            <figcaption className="text-center text-xs text-muted-foreground">1080 × 1920 · design e exportação iguais</figcaption>
          </figure>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2"><h3 className="text-lg font-semibold">Convidar a ler a crónica</h3><p className="text-sm text-muted-foreground">Um título forte, um excerto e um único destino. Publica quando a edição estiver disponível, no horário que fizer sentido para a tua conta.</p></div>
            <p role="status" className="text-sm">{sujo ? "Alterações por guardar" : dados?.estado === "revisto" ? "Revisto · publicação manual" : "Guardado · por rever"}</p>
            {recuperada && <Alert><AlertTitle>Há uma edição local por recuperar</AlertTitle><AlertDescription className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { setStory(recuperada); setRecuperada(null); }}>Restaurar texto</Button><Button size="sm" variant="ghost" onClick={() => { if (chave) limparRecuperacao(chave); setRecuperada(null); }}>Descartar cópia local</Button></AlertDescription></Alert>}
            {([ ["titulo", "Título", false], ["texto", "Excerto da crónica", true], ["cta", "Convite à leitura", false] ] as const).map(([campo, label, grande]) => <div key={campo} className="flex flex-col gap-2">
              <Label htmlFor={`story-${campo}`}>{label} ({story[campo].length}/{LIMITES_STORY[campo]})</Label>
              {grande ? <Textarea id={`story-${campo}`} rows={4} disabled={ocupado} value={story[campo]} maxLength={LIMITES_STORY[campo]} onChange={(e) => editar(campo, e.target.value)} /> : <Input id={`story-${campo}`} disabled={ocupado} value={story[campo]} maxLength={LIMITES_STORY[campo]} onChange={(e) => editar(campo, e.target.value)} />}
            </div>)}
            <div className="flex flex-col gap-2"><Label htmlFor="story-url">Ligação do autocolante</Label><Input id="story-url" type="url" disabled={ocupado} value={story.url} onChange={(e) => editar("url", e.target.value)} /><p className="text-xs text-muted-foreground">O PNG não contém uma ligação clicável. No Instagram, adiciona o autocolante «Ligação» na zona livre por baixo do convite e cola este endereço.</p></div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={ocupado || !sujo} onClick={() => guardar("rascunho")}><Save className="mr-2 size-4" />Guardar Story</Button>
              <Button variant="outline" disabled={ocupado || sujo || dados?.estado === "revisto"} onClick={() => guardar("revisto")}><Check className="mr-2 size-4" />Marcar como revisto</Button>
              <Button variant="outline" disabled={ocupado} onClick={() => executar(async () => { validarStory(story); await exportarStory(story, fonte.numero); })}><Download className="mr-2 size-4" />Descarregar Story</Button>
              <Button variant="ghost" disabled={ocupado} onClick={() => executar(async () => { validarStory(story); await navigator.clipboard.writeText(story.url); setCopiado(true); })}><LinkIcon className="mr-2 size-4" />{copiado ? "Ligação copiada" : "Copiar ligação"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">Avalia visitas à crónica e cliques no autocolante. Ajusta o intervalo com os dados da tua conta. Nada fica agendado.</p>
          </div>
        </div>}
      </TabsContent>
      <TabsContent value="carrossel" forceMount className="mt-0 flex flex-col gap-4 data-[state=inactive]:hidden">
        <div className="flex flex-col gap-1"><h3 className="text-lg font-semibold">Dar uma segunda razão para ler</h3><p className="max-w-prose text-sm text-muted-foreground">No dia seguinte, explora os destaques e a tua leitura. Revê a capa, confirma as fontes e usa a ligação à edição no perfil. Mede visitas, guardados e partilhas. O intervalo é uma sugestão, não um agendamento.</p></div>
        {children}
      </TabsContent>
    </Tabs>
  </section>;
}
