import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, Euro, FolderKanban } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingThumbnail } from "@/components/PendingThumbnail";
import { useProjects } from "@/hooks/useProjects";
import { usePendingContent } from "@/hooks/usePendingContent";
import { useScheduledCounts } from "@/hooks/useScheduledCounts";
import { useQuery } from "@tanstack/react-query";
import { listarCustos } from "@/services/custos";
import { taxaSucesso } from "@/lib/publicacao/taxaSucesso";
import { supabase } from "@/integrations/supabase/client";
import { eur as eurC, filtrar, FORNECEDORES, totais } from "@/features/custos/agregar";

const eur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const mesAtual = () => new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
const ESTADO: Record<string, string> = { active: "Ativo", on_hold: "Em pausa", completed: "Concluído" };

export function Bloco({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-3xl border bg-card p-5 sm:p-6 ${className}`}>{children}</section>;
}

function Titulo({ icon: Icon, children, acao }: { icon: typeof Euro; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
        {children}
      </h2>
      {acao}
    </div>
  );
}

const LinkVer = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline">{children} →</Link>
);

export function CustosBloco() {
  const { data, isLoading: loading } = useQuery({ queryKey: ["custos-ia"], queryFn: listarCustos });
  const mes = totais(filtrar(data ?? [], { periodo: "mes", fornecedor: "todos", pesquisa: "" }));
  const tudo = totais(data ?? []);
  return (
    <Bloco className="flex flex-col justify-between lg:col-span-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custos do mês</h2>
        <span className="text-xs text-muted-foreground">{mesAtual()}</span>
      </div>
      <div className="py-5">
        {loading ? <Skeleton className="h-12 w-32" /> : <div className="text-5xl font-bold tracking-tight">{eurC(mes.total)}</div>}
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">IA · {mes.pedidos} pedidos</p>
      </div>
      <ul className="space-y-2 text-sm">
        {FORNECEDORES.filter((f) => f.id !== "outros").map((f) => (
          <li key={f.id} className="flex justify-between"><span className="text-muted-foreground">{f.nome}</span><span className="font-semibold">{loading ? "…" : eurC(mes[f.id])}</span></li>
        ))}
        <li className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Histórico total</span><span className="font-semibold">{loading ? "…" : eurC(tudo.total)}</span></li>
      </ul>
      <div className="mt-3"><LinkVer to="/custos">Ver custos</LinkVer></div>
    </Bloco>
  );
}

export function ConteudoBloco() {
  const navigate = useNavigate();
  const { items, totalCount, pendingApprovalCount, draftsCount, scheduledCount, loading } = usePendingContent(4);
  const filtro = [
    { r: "Aprovar", n: pendingApprovalCount, to: "/pending" },
    { r: "Agendados", n: scheduledCount, to: "/calendar" },
    { r: "Rascunhos", n: draftsCount, to: "/drafts" },
  ];
  const { data: taxa } = useQuery({
    queryKey: ["taxa-sucesso-30d"],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data, error } = await supabase.from("posts").select("selected_networks, external_post_ids, status").gte("created_at", desde);
      if (error) throw error;
      return taxaSucesso((data ?? []) as never);
    },
  });
  return (
    <section className="space-y-4 lg:col-span-12">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Conteúdo a tratar</h2>
          {!loading && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{totalCount}</span>}
          {taxa && taxa.total > 0 && (
            <span className="text-xs text-muted-foreground" title={taxa.redes.map((r) => `${r.rede}: ${r.sucesso} de ${r.total}`).join(" · ")}>
              Publicações com sucesso (30 dias): <strong className="text-foreground">{taxa.sucesso} de {taxa.total} ({taxa.pct}%)</strong>
            </span>
          )}
        </div>
        <nav className="flex gap-1 rounded-2xl border bg-card p-1.5" aria-label="Conteúdo a tratar">
          {filtro.map((f, i) => (
            <Link key={f.to} to={f.to} className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f.r}{!loading && ` (${f.n})`}
            </Link>
          ))}
        </nav>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <Bloco className="text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-primary/60" aria-hidden />
          <p className="text-sm font-medium text-foreground">Tudo em dia</p>
          <p className="text-xs">Sem aprovações, agendamentos ou rascunhos pendentes.</p>
        </Bloco>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {items.map((item) => (
              <PendingThumbnail key={`${item.type}-${item.id}`} id={item.id} type={item.type} thumbnail={item.thumbnail} mediaUrl={item.mediaUrl}
                mediaType={item.mediaType} hasPosterPreview={item.hasPosterPreview} mediaCount={item.mediaCount} caption={item.caption}
                createdAt={item.createdAt} scheduledDate={item.scheduledDate} route={item.route} onNavigate={navigate} />
            ))}
          </div>
          {totalCount > items.length && <p className="text-center text-xs text-muted-foreground">+{totalCount - items.length} itens não mostrados</p>}
        </>
      )}
    </section>
  );
}

export function CalendarioBloco() {
  const { counts, loading } = useScheduledCounts();
  const linhas = [
    { r: "Publicações de hoje", n: counts.today, cor: "bg-primary" },
    { r: "Agendado para esta semana", n: counts.thisWeek, cor: "bg-primary/60" },
    { r: "Agendado este mês", n: counts.thisMonth, cor: "bg-primary/30" },
  ];
  return (
    <Bloco className="lg:col-span-6">
      <Titulo icon={CalendarDays} acao={<LinkVer to="/calendar">Ver calendário</LinkVer>}>Calendário</Titulo>
      <ul className="space-y-2">
        {linhas.map((l) => (
          <li key={l.r} className="flex items-center justify-between rounded-2xl border bg-background p-3.5">
            <span className="flex items-center gap-3 text-sm text-muted-foreground"><span className={`h-2 w-2 rounded-full ${l.cor}`} aria-hidden />{l.r}</span>
            <span className="text-xl font-bold">{loading ? "…" : l.n}</span>
          </li>
        ))}
      </ul>
    </Bloco>
  );
}

export function ProjetosBloco({ projetoId }: { projetoId: string | null }) {
  const { projects } = useProjects();
  const lista = (projetoId ? projects.filter((p) => p.id === projetoId) : projects.filter((p) => p.status !== "archived")).slice(0, 3);
  const ativos = projects.filter((p) => p.status === "active").length;
  return (
    <Bloco className="lg:col-span-6">
      <Titulo icon={FolderKanban} acao={<LinkVer to="/projects">Ver todos ({projects.length})</LinkVer>}>{projetoId ? "Projeto escolhido" : "Projetos ativos"}</Titulo>
      {!projetoId && <p className="mb-3 text-xs text-muted-foreground">{ativos} ativos · todos os projetos</p>}
      {lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhum projeto criado. <Link to="/projects" className="underline">Criar projeto</Link></p>
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="group flex items-center justify-between rounded-2xl border bg-background p-3.5 transition-colors hover:border-primary">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">{p.name.charAt(0)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold uppercase tracking-tight">{p.name}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{ESTADO[p.status] ?? "Arquivado"}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
