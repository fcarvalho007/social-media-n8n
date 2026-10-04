import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@/newsletter/shim/start";
import { Loader2, X, Sparkles, Star, Mail, Globe, AlertTriangle, Check } from "lucide-react";
import { sugerirOrganizacaoEdicao, type SugestaoOrganizacao } from "@/newsletter/lib/organizar-edicao.functions";
import { atualizarNoticia, registarAudit } from "./data";

const T = {
  card: "#FFFFFF", line: "#E4E7EC", ink: "#101828", muted: "#667085",
  faint: "#98A2B3", primary: "#8B5CF6", ok: "#10B981", warn: "#F59E0B", danger: "#EF4444",
  shell: "#F7F8FA",
};

interface Props {
  edicaoId: string;
  nomeUtilizador: string;
  onClose: () => void;
  onAplicado: (n: number) => void;
}

export function ModalSugestaoOrganizacao({ edicaoId, nomeUtilizador, onClose, onAplicado }: Props) {
  const sugerir = useServerFn(sugerirOrganizacaoEdicao);
  const [aLoad, setALoad] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<SugestaoOrganizacao[]>([]);
  const [aceites, setAceites] = useState<Set<string>>(new Set());
  const [aAplicar, setAAplicar] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setALoad(true); setErro(null); setAviso(null);
      try {
        const r = await sugerir({ data: { edicaoId } });
        if (!vivo) return;
        if (!r.ok) {
          setErro(r.motivo ?? "Sem sugestões disponíveis.");
          setSugestoes([]);
          return;
        }
        setSugestoes(r.sugestoes);
        setAceites(new Set(r.sugestoes.map((s) => s.id)));
        if (r.aviso) setAviso(r.aviso);
      } catch (e) {
        if (!vivo) return;
        setErro((e as Error).message || "Falhou a chamada à IA.");
      } finally {
        if (vivo) setALoad(false);
      }
    })();
    return () => { vivo = false; };
  }, [edicaoId, sugerir]);

  const grupos = useMemo(() => {
    const destaques = sugestoes.filter((s) => s.destaque_proposto);
    const news = sugestoes.filter((s) => !s.destaque_proposto && s.destino_proposto === "news");
    const site = sugestoes.filter((s) => !s.destaque_proposto && s.destino_proposto === "site");
    return { destaques, news, site };
  }, [sugestoes]);

  const total = sugestoes.length;
  const nAceites = aceites.size;

  const toggle = (id: string) => {
    setAceites((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const aplicar = async () => {
    const alvo = sugestoes.filter((s) => aceites.has(s.id));
    if (alvo.length === 0) return;
    setAAplicar(true);
    try {
      let alteradas = 0;
      await Promise.all(alvo.map(async (s) => {
        const patch: { destaque?: boolean; destino?: "news" | "site" } = {};
        if (s.destaque_proposto !== s.destaque_actual) patch.destaque = s.destaque_proposto;
        if (s.destino_proposto !== s.destino_actual) patch.destino = s.destino_proposto;
        if (Object.keys(patch).length === 0) return;
        await atualizarNoticia(s.id, patch as never);
        alteradas += 1;
      }));
      await registarAudit(nomeUtilizador, `Aplicou sugestão de organização IA (${alteradas}/${alvo.length})`, {
        edicao_id: edicaoId, aceites: alvo.length, alteradas,
      });
      onAplicado(alteradas);
      onClose();
    } catch (e) {
      setErro((e as Error).message || "Falhou a aplicação das sugestões.");
    } finally {
      setAAplicar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-3 sm:p-6" style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-[720px] max-h-[92vh] flex flex-col rounded-2xl shadow-2xl" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: T.line }}>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: `${T.primary}18`, color: T.primary }}>
            <Sparkles size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold" style={{ color: T.ink }}>Sugestão de organização</h2>
            <p className="text-[12.5px]" style={{ color: T.muted }}>Revê e aceita antes de aplicar — nada muda até carregares em «Aplicar».</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-md hover:bg-slate-100" style={{ color: T.muted }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {aLoad && (
            <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: T.muted }}>
              <Loader2 size={28} className="animate-spin" style={{ color: T.primary }} />
              <p className="text-[13px]">A pedir sugestões à IA…</p>
            </div>
          )}

          {!aLoad && erro && (
            <div className="p-4 rounded-lg text-[13px] flex items-start gap-2" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          {!aLoad && !erro && sugestoes.length > 0 && (
            <>
              {aviso && (
                <div className="mb-4 p-3 rounded-lg text-[12.5px] flex items-start gap-2" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {aviso}
                </div>
              )}

              <Grupo titulo="Destaques" icon={<Star size={14} />} cor="#EC4899" itens={grupos.destaques} aceites={aceites} toggle={toggle} />
              <Grupo titulo="Newsletter (email)" icon={<Mail size={14} />} cor="#4338CA" itens={grupos.news} aceites={aceites} toggle={toggle} />
              <Grupo titulo="Só no site" icon={<Globe size={14} />} cor="#64748B" itens={grupos.site} aceites={aceites} toggle={toggle} />
            </>
          )}
        </div>

        {/* Footer */}
        {!aLoad && !erro && sugestoes.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center gap-3" style={{ borderColor: T.line, background: T.shell }}>
            <span className="text-[12.5px]" style={{ color: T.muted }}>
              <strong style={{ color: T.ink }}>{nAceites}</strong> aceites de {total}
            </span>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-[13px] font-semibold" style={{ color: T.muted, border: `1px solid ${T.line}`, background: T.card }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={aplicar}
              disabled={nAceites === 0 || aAplicar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ background: T.primary }}
            >
              {aAplicar ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Aplicar sugestões aceites
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Grupo({ titulo, icon, cor, itens, aceites, toggle }: {
  titulo: string; icon: React.ReactNode; cor: string;
  itens: SugestaoOrganizacao[]; aceites: Set<string>; toggle: (id: string) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: cor }}>
        {icon} {titulo} · {itens.length}
      </div>
      <ul className="space-y-2">
        {itens.map((s) => {
          const aceite = aceites.has(s.id);
          const mudou = s.destaque_proposto !== s.destaque_actual || s.destino_proposto !== s.destino_actual;
          return (
            <li key={s.id} className="p-3 rounded-lg flex items-start gap-3" style={{ background: aceite ? "#FAFAFF" : T.card, border: `1px solid ${aceite ? cor + "40" : T.line}` }}>
              <input
                type="checkbox"
                checked={aceite}
                onChange={() => toggle(s.id)}
                className="mt-1 h-4 w-4 cursor-pointer"
                aria-label={`Aceitar sugestão para ${s.titulo}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[13.5px] font-semibold leading-snug" style={{ color: T.ink }}>{s.titulo}</p>
                  {!mudou && (
                    <span className="shrink-0 text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#F2F4F7", color: T.faint }}>
                      já está assim
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] mt-0.5" style={{ color: T.faint }}>
                  {s.categoria ?? "sem categoria"}
                </p>
                <p className="text-[12.5px] italic mt-1.5" style={{ color: T.muted }}>
                  “{s.justificacao}”
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
