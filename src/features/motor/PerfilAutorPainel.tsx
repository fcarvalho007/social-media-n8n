import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { gravarPerfilAutor, lerPerfilAutor } from "@/services/motor";
import { LIMITES_PERFIL, MAX_NOTAS_AUTOR, VOZES_AUTOR, type PerfilAutor } from "../../../supabase/functions/_shared/motor/autor";

const CAMPOS = [
  { k: "apresentacao", nome: "Quem escreve", linhas: 4, ph: "Percurso profissional relevante, sem dados pessoais" },
  { k: "publico", nome: "Público", linhas: 2, ph: "Para quem escreves" },
  { k: "teses", nome: "Teses", linhas: 5, ph: "Ideias que defendes, uma por linha" },
  { k: "objetivo_cronica", nome: "Objetivo da crónica", linhas: 2, ph: "O que cada crónica deve deixar ao leitor" },
] as const;

/** Per-project author voice. Saved on the backend; each new AI job takes a snapshot of it. */
export function PerfilAutorPainel({ projectId }: { projectId: string }) {
  const [p, setP] = useState<PerfilAutor | null>(null);
  const [guardado, setGuardado] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  useEffect(() => {
    let vivo = true; setP(null); setMsg(null);
    lerPerfilAutor(projectId).then((r) => { if (vivo) { setP(r); setGuardado(JSON.stringify(r)); } }).catch((e: Error) => vivo && setMsg(e.message));
    return () => { vivo = false; };
  }, [projectId]);

  if (!p) return <p className="text-xs text-muted-foreground">{msg ?? "A ler o perfil de autor…"}</p>;
  const alterado = JSON.stringify(p) !== guardado;
  const alternar = (id: PerfilAutor["voz"][number]) => setP({ ...p, voz: p.voz.includes(id) ? p.voz.filter((v) => v !== id) : [...p.voz, id] });

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-3 text-sm" aria-label="Voz do autor">
      <div>
        <strong className="font-medium">Contexto do autor</strong>
        <p className="text-xs text-muted-foreground">Guardado para este projeto e usado como lente, não como fonte de factos. Cada carrossel novo com IA guarda uma cópia; os já feitos não mudam.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Escolhas rápidas">
        {VOZES_AUTOR.map((v) => {
          const on = p.voz.includes(v.id);
          return (
            <button key={v.id} type="button" aria-pressed={on} onClick={() => alternar(v.id)}
              className={cn("min-h-11 rounded-full border px-3 text-xs sm:min-h-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-primary/10 font-medium text-foreground" : "border-input text-muted-foreground")}>
              {v.nome}
            </button>
          );
        })}
      </div>
      {CAMPOS.map((c) => (
        <div key={c.k} className="space-y-1">
          <Label htmlFor={`perfil-${c.k}`}>{c.nome} <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Textarea id={`perfil-${c.k}`} rows={c.linhas} maxLength={LIMITES_PERFIL[c.k]} value={p[c.k]} onChange={(e) => setP({ ...p, [c.k]: e.target.value })} placeholder={c.ph} />
        </div>
      ))}
      <div className="space-y-1">
        <Label htmlFor="notas-autor">Especificidades <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="notas-autor" rows={3} maxLength={MAX_NOTAS_AUTOR} value={p.notas} onChange={(e) => setP({ ...p, notas: e.target.value })}
          placeholder="Especialidade, público, teses em aberto…" />
        <p className="text-xs text-muted-foreground">Os factos vêm sempre da fonte, com §. A tua interpretação aparece identificada como leitura. Nunca são inventados estudos, números, citações nem experiências pessoais.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-11 sm:h-8" disabled={!alterado || aGravar} onClick={async () => {
          setAGravar(true); setMsg(null);
          try { await gravarPerfilAutor(projectId, p); setGuardado(JSON.stringify(p)); setMsg("Perfil gravado."); }
          catch (e) { setMsg((e as Error).message); }
          finally { setAGravar(false); }
        }}>{aGravar && <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" />}Gravar perfil</Button>
        {msg && <p role="status" className="text-xs text-muted-foreground">{msg}</p>}
      </div>
    </section>
  );
}
