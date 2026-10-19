import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { Inbox } from 'lucide-react';
import { NoticiaEncontrada } from '@/features/percurso/NoticiaEncontrada';
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CuradoriaNavegacao } from "@/components/CuradoriaNavegacao";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";
import { getEdicaoAtual, listarFontes } from "@/newsletter/features/newsletter/data";
import { AdicionarNoticias } from "@/newsletter/features/newsletter/partilhado/modais/AdicionarNoticias";
import { Fontes } from "@/newsletter/features/newsletter/partilhado/modais/Fontes";
import { FilaEntrada } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";
import { EmailsPage } from "@/newsletter/routes/_authenticated/emails";
import { ModoRecolha } from "@/newsletter/features/definicoes/ModoRecolha";
import { ConfirmacaoExternaHost } from "@/newsletter/shim/confirmar";
import "@/newsletter/newsletter.css";

export default function Curadoria() {
  const [params, setParams] = useSearchParams();
  const separador = ['emails','fontes'].includes(params.get('separador') ?? '') ? params.get('separador')! : 'noticias';
  const setSeparador = (valor: string) => setParams(p => { const n = new URLSearchParams(p); if(valor === 'noticias') n.delete('separador'); else n.set('separador',valor); return n; });
  // Refresh batch results without losing the URL-backed editorial filters.
  const [versaoLista, setVersaoLista] = useState(0);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useCurrentUserRoles();
  const fontes = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  const [colarAberto, setColarAberto] = useState(false);
  // Manual entry needs an edition; pasted items go to «Por rever» regardless.
  const edicao = useQuery({ queryKey: ["edicao-atual"], queryFn: getEdicaoAtual, enabled: colarAberto });
  const ativas = fontes.data?.filter(f => f.activa).length;
  return <div className="hub-page">
    <ConfirmacaoExternaHost />
    <CabecalhoPagina titulo="Curadoria" descricao="Reúne notícias, emails e documentos. Escolhe o que vale a pena transformar em conteúdo." icone={Inbox} acoes={<Button variant="outline" className="min-h-11" title="RSS, sites e newsletters de onde vêm as notícias" onClick={() => setSeparador("fontes")}>Gerir fontes</Button>}>
      {fontes.data && <span className="text-xs text-muted-foreground">{ativas} de {fontes.data.length} fontes de notícias ativas</span>}
      {fontes.isError && <span className="text-sm text-destructive">Não foi possível consultar as fontes.</span>}
    </CabecalhoPagina>
    <CuradoriaNavegacao />
      {separador === "noticias" && <section aria-label="Notícias recebidas" className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button size="sm" className="min-h-11" onClick={() => setColarAberto(true)}>Colar notícias</Button>
        </div>
        <FilaEntrada compacto recolherAntes={isAdmin} onConcluido={(r) => {
          void qc.invalidateQueries();
          setVersaoLista(v => v + 1);
          toast.success(r.noticias > 0 ? `${r.noticias} ${r.noticias === 1 ? "notícia nova" : "notícias novas"} em «Por rever».` : "Processamento concluído, sem notícias novas.");
        }} />
        {params.get('noticia') && <NoticiaEncontrada id={params.get('noticia')!} fechar={() => setParams(p => { const n = new URLSearchParams(p); n.delete('noticia'); return n; })} />}
        <CuradoriaNoticias key={versaoLista} persistirFiltros />
        {colarAberto && <AdicionarNoticias
          edicaoId={edicao.data?.id ?? null}
          isAdmin={isAdmin}
          nomeExibicao={user?.email ?? "Equipa"}
          notify={(m, opts) => opts?.tipo === "erro" ? toast.error(m === "Sem edição" ? "Não há nenhuma edição em rascunho para adicionar manualmente." : m) : toast.success(m)}
          onFechar={() => { setColarAberto(false); void qc.invalidateQueries(); setVersaoLista(v => v + 1); }}
        />}
      </section>}
      {separador === "emails" && <EmailsPage embutido />}
      {separador === "fontes" && <section aria-label="Fontes de notícias" className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border bg-card">
          <Fontes embutido isAdmin={isAdmin} nomeExibicao={user?.email ?? "Equipa"} notify={(m, opts) => opts?.tipo === "erro" ? toast.error(m) : toast.success(m)} onFechar={() => setSeparador("noticias")} />
        </div>
        {isAdmin && <ModoRecolha />}
        <Button variant="outline" asChild><Link to="/estudio/ligacoes">Ver ligação dos emails e integrações</Link></Button>
      </section>}
  </div>;
}
