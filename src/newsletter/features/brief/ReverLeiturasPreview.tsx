import { useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileCheck2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

type Reading = {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  summary: string;
  relevance: string;
  text: string;
  approved: boolean;
};

const INITIAL_READINGS: Reading[] = [
  {
    id: "google",
    title: "Google leva agentes de IA para dentro das equipas de marketing",
    shortTitle: "Google lança agentes para equipas de marketing",
    category: "Inteligência artificial",
    summary: "Os novos agentes recebem objetivos, consultam informação e executam sequências de trabalho com menor intervenção manual.",
    relevance: "O ganho principal pode estar menos na geração de conteúdos e mais na redução do trabalho repetitivo entre ferramentas.",
    text: "A parte mais interessante dos agentes não é fazerem mais coisas por nós. É obrigarem-nos a decidir melhor aquilo que queremos delegar. Uma equipa com maus processos não se transforma numa boa equipa por acrescentar agentes — apenas automatiza mais depressa a confusão.",
    approved: true,
  },
  {
    id: "meta",
    title: "Meta altera a forma como as marcas treinam campanhas automatizadas",
    shortTitle: "Meta altera campanhas automatizadas",
    category: "Social media",
    summary: "A plataforma passa a combinar mais sinais criativos e comerciais antes de distribuir orçamento entre audiências e formatos.",
    relevance: "As equipas terão de alimentar melhor o sistema e avaliar a qualidade dos sinais, em vez de se limitarem a ajustar campanhas depois do lançamento.",
    text: "A automação publicitária está a mudar o lugar onde se ganha vantagem. Quando a plataforma toma mais decisões, a diferença deixa de estar no botão que carregamos e passa para a qualidade do contexto, dos criativos e dos dados que lhe entregamos.",
    approved: false,
  },
  {
    id: "openai",
    title: "OpenAI apresenta ferramentas para transformar conhecimento interno em ações",
    shortTitle: "OpenAI liga conhecimento interno a ações",
    category: "Estratégia",
    summary: "As novas ferramentas procuram ligar documentos, dados operacionais e tarefas numa experiência única para equipas.",
    relevance: "A utilidade dependerá da qualidade do conhecimento interno e das regras que limitam o que cada sistema pode executar.",
    text: "O verdadeiro teste não será quantos documentos uma ferramenta consegue ler, mas se a organização sabe distinguir informação disponível de conhecimento fiável. Sem essa disciplina, ligar tudo a tudo só torna os erros mais rápidos e mais difíceis de localizar.",
    approved: true,
  },
];

const REGEN_OPTIONS = [
  "Manter factualidade",
  "Alterar ângulo",
  "Tornar mais pragmático",
  "Encurtar",
  "Tornar menos opinativo",
] as const;

const VARIANTS: Record<(typeof REGEN_OPTIONS)[number], string> = {
  "Manter factualidade": "A mudança transfere parte do trabalho operacional para a plataforma, mas não elimina a responsabilidade da equipa. O resultado continuará a depender da qualidade dos dados, dos criativos e das regras usadas para orientar a automação.",
  "Alterar ângulo": "Quanto mais decisões passam para a plataforma, mais importante se torna aquilo que acontece antes da campanha. A vantagem não desaparece: muda de lugar, do ajuste manual para a preparação dos sinais que orientam o sistema.",
  "Tornar mais pragmático": "Na prática, as equipas devem rever três pontos antes de ativar esta automação: qualidade dos dados, variedade criativa e critérios de avaliação. Sem isso, o sistema apenas distribui mais depressa decisões pouco informadas.",
  Encurtar: "Quando a plataforma decide mais, a vantagem passa do ajuste manual para a qualidade dos dados, dos criativos e das regras que orientam o sistema.",
  "Tornar menos opinativo": "A alteração aumenta o peso dos dados, dos criativos e das regras fornecidas à plataforma. As equipas passam a concentrar mais trabalho na preparação dos sinais e menos no ajuste manual posterior.",
};

function StatusMark({ approved }: { approved: boolean }) {
  return approved ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-estado-pronto" aria-hidden="true" />
  ) : (
    <Circle className="h-4 w-4 shrink-0 fill-estado-falta text-estado-falta" aria-hidden="true" />
  );
}

function Readiness({ approved, onReview }: { approved: number; onReview: () => void }) {
  const rows = ["CONTEÚDO", "CURADORIA", "BRIEFS", "LEITURAS", "LINKS", "CRÓNICA"];
  const complete = approved === 3;

  return (
    <aside className="rounded-lg border border-border bg-card p-5" aria-labelledby="readiness-title">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Readiness E3 · demonstração</p>
          <h2 id="readiness-title" className="mt-1 font-display text-lg font-bold text-foreground">Prontidão da edição</h2>
        </div>
        <FileCheck2 className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <ul className="mt-3 divide-y divide-border/70">
        {rows.map((row) => {
          const readings = row === "LEITURAS";
          const ok = !readings || complete;
          return (
            <li key={row} className="flex min-h-10 items-center gap-3 py-2 text-[12px] font-bold tracking-[0.08em]">
              <span className="min-w-0 flex-1 text-foreground">{row}</span>
              {readings ? (
                <span className={ok ? "text-estado-pronto" : "text-estado-falta"}>{ok ? "✓ 3/3" : `${approved}/3`}</span>
              ) : (
                <span className="text-estado-pronto">✓</span>
              )}
            </li>
          );
        })}
      </ul>
      {complete ? (
        <p className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm font-semibold text-estado-pronto">
          <CheckCircle2 className="h-4 w-4" /> 3/3 leituras aprovadas
        </p>
      ) : (
        <Button variant="outline" className="mt-4 w-full justify-between" onClick={onReview}>
          Rever {3 - approved} leitura <span aria-hidden="true">→</span>
        </Button>
      )}
    </aside>
  );
}

export function ReverLeiturasPreview() {
  const [readings, setReadings] = useState(INITIAL_READINGS);
  const [selectedId, setSelectedId] = useState("meta");
  const [opened, setOpened] = useState(() => new Set(["meta"]));
  const [confirmAll, setConfirmAll] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selected = readings.find((reading) => reading.id === selectedId) ?? readings[0];
  const approved = readings.filter((reading) => reading.approved).length;
  const allOpened = opened.size === readings.length;
  const wordCount = selected.text.trim() ? selected.text.trim().split(/\s+/).length : 0;

  const selectReading = (id: string) => {
    setSelectedId(id);
    setOpened((current) => new Set(current).add(id));
  };

  const updateText = (text: string) => {
    setReadings((current) => current.map((reading) => (
      reading.id === selected.id ? { ...reading, text, approved: false } : reading
    )));
  };

  const approveCurrent = () => {
    setReadings((current) => current.map((reading) => (
      reading.id === selected.id ? { ...reading, approved: true } : reading
    )));
    const next = readings.find((reading) => reading.id !== selected.id && !reading.approved);
    if (next) selectReading(next.id);
  };

  const regenerate = (option: (typeof REGEN_OPTIONS)[number]) => {
    updateText(VARIANTS[option]);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

  const approveAll = () => {
    setReadings((current) => current.map((reading) => ({ ...reading, approved: true })));
    setConfirmAll(false);
  };

  const progress = useMemo(() => Math.round((approved / readings.length) * 100), [approved, readings.length]);

  return (
    <div className="min-h-dvh overflow-x-clip bg-muted/40 text-foreground">
      <div className="h-1 bg-border" aria-hidden="true">
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="rounded-lg border border-border bg-card px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Digital Sprint #319</span>
                <span className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground">Preview QA · não publicado</span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Rever leituras</h1>
              <p className="mt-2 text-sm text-muted-foreground">{approved} de 3 aprovadas</p>
            </div>
            {allOpened && approved < 3 ? (
              <Button variant="outline" onClick={() => setConfirmAll(true)}>
                <ShieldCheck /> Aprovar todas
              </Button>
            ) : null}
          </div>
          <div className="mt-5 flex items-start gap-3 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p><strong className="text-foreground">Princípio editorial:</strong> uma sugestão da IA só passa a “A minha leitura” depois de aprovação explícita.</p>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)_17rem] lg:items-start">
          <section className="rounded-lg border border-border bg-card p-3" aria-labelledby="reading-list-title">
            <div className="px-2 pb-3 pt-1">
              <h2 id="reading-list-title" className="font-display text-base font-bold">Destaques</h2>
              <p className="mt-1 text-xs text-muted-foreground">Abre as três leituras antes da aprovação em lote.</p>
            </div>
            <div className="space-y-1" role="list">
              {readings.map((reading, index) => {
                const active = reading.id === selected.id;
                return (
                  <Button
                    key={reading.id}
                    type="button"
                    variant="ghost"
                    onClick={() => selectReading(reading.id)}
                    aria-current={active ? "true" : undefined}
                    className={`h-auto min-h-16 w-full justify-start whitespace-normal rounded-md px-3 py-3 text-left ${active ? "bg-primary/10 hover:bg-primary/10" : ""}`}
                  >
                    <span className="w-5 shrink-0 self-start pt-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">0{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold leading-5 text-foreground">{reading.shortTitle}</span>
                      <span className={`mt-1 flex items-center gap-1.5 text-xs ${reading.approved ? "text-estado-pronto" : "text-estado-falta"}`}>
                        <StatusMark approved={reading.approved} /> {reading.approved ? "Aprovada" : "Por rever"}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
            {!allOpened ? <p className="px-2 pb-1 pt-3 text-xs leading-5 text-muted-foreground">Revistas: {opened.size}/3</p> : null}
          </section>

          <article className="min-w-0 rounded-lg border border-border bg-card shadow-sm" aria-labelledby="reading-title">
            <div className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-primary">{selected.category}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${selected.approved ? "bg-estado-pronto-suave text-estado-pronto" : "bg-estado-falta-suave text-estado-falta"}`}>
                  <StatusMark approved={selected.approved} /> {selected.approved ? "Aprovada" : "Por rever"}
                </span>
              </div>
              <h2 id="reading-title" className="mt-3 max-w-3xl font-display text-2xl font-bold leading-tight sm:text-3xl">{selected.title}</h2>
            </div>

            <div className="grid gap-5 border-b border-border px-5 py-5 sm:px-7 md:grid-cols-2">
              <section aria-labelledby="summary-title">
                <h3 id="summary-title" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Resumo factual</h3>
                <p className="mt-2 text-sm leading-6 text-foreground">{selected.summary}</p>
              </section>
              <section aria-labelledby="relevance-title" className="md:border-l md:border-border md:pl-5">
                <h3 id="relevance-title" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Porque interessa</h3>
                <p className="mt-2 text-sm leading-6 text-foreground">{selected.relevance}</p>
              </section>
            </div>

            <section className="px-5 py-5 sm:px-7 sm:py-6" aria-labelledby="suggestion-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{selected.approved ? "Texto aprovado" : "Proposta interna"}</p>
                  <h3 id="suggestion-title" className="mt-1 font-serif text-xl font-bold">{selected.approved ? "A minha leitura" : "Leitura sugerida pela IA"}</h3>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{wordCount} palavras</span>
              </div>
              <Textarea
                ref={editorRef}
                value={selected.text}
                onChange={(event) => updateText(event.target.value)}
                aria-label={selected.approved ? "A minha leitura aprovada" : "Leitura sugerida pela IA"}
                className="mt-4 min-h-40 resize-y rounded-md border-border bg-background px-4 py-3 font-serif text-base leading-7 shadow-none focus-visible:ring-primary"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {selected.approved ? "Continua editável. Qualquer alteração volta a exigir aprovação." : "Ainda não é apresentada publicamente como opinião de Frederico Carvalho."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><RotateCcw /> Regenerar <ChevronDown /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {REGEN_OPTIONS.map((option) => <DropdownMenuItem key={option} onSelect={() => regenerate(option)}>{option}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={() => editorRef.current?.focus()}>Editar</Button>
                <Button onClick={approveCurrent} disabled={selected.approved || !selected.text.trim()} className="sm:ml-auto">
                  <Check /> {selected.approved ? "Aprovada" : "Aprovar e continuar"}
                </Button>
              </div>
            </section>
          </article>

          <Readiness approved={approved} onReview={() => {
            const pending = readings.find((reading) => !reading.approved);
            if (pending) selectReading(pending.id);
          }} />
        </div>
      </main>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação das 3 leituras?</AlertDialogTitle>
            <AlertDialogDescription>As três propostas foram abertas. Esta confirmação simula a aprovação editorial em lote.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approveAll}>Confirmar aprovação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}