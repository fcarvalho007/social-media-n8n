import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/newsletter/features/newsletter/useSessao";

const T = {
  card: "#FFFFFF", line: "#E4E7EC", ink: "#101828",
  muted: "#667085", faint: "#98A2B3", primary: "#8B5CF6",
  ok: "#10B981", warn: "#F59E0B", danger: "#EF4444",
};

interface Prioridade {
  id: string;
  palavra_chave: string;
  peso: number;
  updated_at: string;
}

async function listar(): Promise<Prioridade[]> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => { select: (c: string) => { order: (col: string, o: { ascending: boolean }) => Promise<{ data: Prioridade[] | null; error: unknown }> } };
  }).from("nl_prioridades_editoriais").select("id, palavra_chave, peso, updated_at").order("peso", { ascending: false });
  if (error) throw error as Error;
  return data ?? [];
}

async function criar(palavra: string, peso: number) {
  const { error } = await (supabase as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> } })
    .from("nl_prioridades_editoriais").insert({ palavra_chave: palavra.trim().toLowerCase(), peso });
  if (error) throw error as Error;
}
async function actualizarPeso(id: string, peso: number) {
  const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
    .from("nl_prioridades_editoriais").update({ peso }).eq("id", id);
  if (error) throw error as Error;
}
async function apagar(id: string) {
  const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
    .from("nl_prioridades_editoriais").delete().eq("id", id);
  if (error) throw error as Error;
}

export function PrioridadesEditoriaisCard() {
  const qc = useQueryClient();
  const { isAdmin } = useSessao();
  const q = useQuery({ queryKey: ["prioridades_editoriais"], queryFn: listar });

  const [nova, setNova] = useState("");
  const [novoPeso, setNovoPeso] = useState(2);
  const [erro, setErro] = useState<string | null>(null);

  const mCriar = useMutation({
    mutationFn: () => criar(nova, novoPeso),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prioridades_editoriais"] }); setNova(""); setNovoPeso(2); setErro(null); },
    onError: (e: Error) => setErro(e.message || "Falhou a criar a prioridade."),
  });
  const mPeso = useMutation({
    mutationFn: (v: { id: string; peso: number }) => actualizarPeso(v.id, v.peso),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prioridades_editoriais"] }),
  });
  const mApagar = useMutation({
    mutationFn: (id: string) => apagar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prioridades_editoriais"] }),
  });

  return (
    <section className="rounded-[20px] p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${T.primary}18`, color: T.primary }}>
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: T.muted }}>Prioridades editoriais</h2>
          <p className="text-[12.5px]" style={{ color: T.faint }}>
            Palavras-chave que a IA usa como pista ao sugerir destaques e distribuir notícias entre email e site. Peso positivo puxa a favor, negativo empurra para «só site».
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-3 flex items-center gap-2 text-[12.5px]" style={{ color: T.warn }}>
          <Lock size={13} /> Só administradores podem alterar. Estás em modo de leitura.
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            placeholder="ex.: comportamento do consumidor"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg text-[14px]"
            style={{ border: `1px solid ${T.line}`, color: T.ink }}
          />
          <select
            value={novoPeso}
            onChange={(e) => setNovoPeso(Number(e.target.value))}
            className="px-2 py-2 rounded-lg text-[14px]"
            style={{ border: `1px solid ${T.line}`, color: T.ink }}
            aria-label="Peso"
          >
            {[-5,-4,-3,-2,-1,1,2,3,4,5].map((p) => <option key={p} value={p}>{p > 0 ? `+${p}` : p}</option>)}
          </select>
          <button
            type="button"
            onClick={() => nova.trim() && mCriar.mutate()}
            disabled={!nova.trim() || mCriar.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: T.primary }}
          >
            {mCriar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </button>
        </div>
      )}

      {erro && <div className="text-[12.5px] mb-3" style={{ color: T.danger }}>{erro}</div>}

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: T.muted }}>
          <Loader2 size={14} className="animate-spin" /> A carregar…
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-[13px]" style={{ color: T.faint }}>Sem prioridades definidas.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: T.line }}>
          {(q.data ?? []).map((p) => {
            const cor = p.peso >= 0 ? T.ok : T.danger;
            return (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-[14px] font-medium" style={{ color: T.ink }}>{p.palavra_chave}</span>
                {isAdmin ? (
                  <select
                    value={p.peso}
                    onChange={(e) => mPeso.mutate({ id: p.id, peso: Number(e.target.value) })}
                    className="px-2 py-1 rounded-md text-[12.5px] font-bold"
                    style={{ border: `1px solid ${T.line}`, color: cor }}
                    aria-label={`Peso de ${p.palavra_chave}`}
                  >
                    {[-5,-4,-3,-2,-1,1,2,3,4,5].map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>)}
                  </select>
                ) : (
                  <span className="text-[12.5px] font-bold" style={{ color: cor }}>{p.peso > 0 ? `+${p.peso}` : p.peso}</span>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Remover a prioridade «${p.palavra_chave}»?`)) mApagar.mutate(p.id); }}
                    className="p-1.5 rounded-md hover:bg-red-50"
                    aria-label="Remover"
                    style={{ color: T.danger }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
