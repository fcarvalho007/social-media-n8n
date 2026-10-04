import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMarca, listarIdentidades, listarProjetos, setMarca, type Identidade, type Projeto } from "@/services/estudio";

type Estado = "a_carregar" | "pronto" | "erro";

interface ProjetoCtx {
  estado: Estado;
  erro: string | null;
  projetos: Projeto[];
  identidades: Identidade[];
  /** Persisted "Para quem?" choice (null = all projects). */
  projetoId: string | null;
  projeto: Projeto | null;
  /** True while a new choice is being saved; the UI shows the previous value until confirmed. */
  aGuardar: boolean;
  escolher: (id: string | null) => Promise<void>;
  recarregar: () => void;
  identidadesDoProjeto: (id: string | null) => Identidade[];
}

const Ctx = createContext<ProjetoCtx | null>(null);

export function ProjetoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("a_carregar");
  const [erro, setErro] = useState<string | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [identidades, setIdentidades] = useState<Identidade[]>([]);
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado("a_carregar"); setErro(null);
    Promise.all([listarProjetos(), listarIdentidades(), getMarca()])
      .then(([p, i, m]) => {
        if (!vivo) return;
        setProjetos(p); setIdentidades(i);
        // A stored project that no longer exists falls back to "all".
        setProjetoId(m && p.some((x) => x.id === m) ? m : null);
        setEstado("pronto");
      })
      .catch((e: Error) => { if (vivo) { setErro(e.message || "Erro desconhecido"); setEstado("erro"); } });
    return () => { vivo = false; };
  }, [tentativa]);

  const escolher = useCallback(async (id: string | null) => {
    const anterior = projetoId;
    setAGuardar(true);
    setProjetoId(id); // optimistic, rolled back on failure
    try { await setMarca(id); }
    catch (e) { setProjetoId(anterior); throw e; }
    finally { setAGuardar(false); }
  }, [projetoId]);

  const valor = useMemo<ProjetoCtx>(() => ({
    estado, erro, projetos, identidades, projetoId, aGuardar, escolher,
    projeto: projetos.find((p) => p.id === projetoId) ?? null,
    recarregar: () => setTentativa((n) => n + 1),
    identidadesDoProjeto: (id) => (id ? identidades.filter((i) => i.project_id === id) : identidades),
  }), [estado, erro, projetos, identidades, projetoId, aGuardar, escolher]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useProjeto(): ProjetoCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useProjeto fora do ProjetoProvider");
  return c;
}

/** Optional variant for code that may run outside the provider (e.g. shared hooks). */
export function useProjetoOpcional(): ProjetoCtx | null {
  return useContext(Ctx);
}
