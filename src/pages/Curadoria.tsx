import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";
import { listarFontes } from "@/newsletter/features/newsletter/data";
import { Fontes } from "@/newsletter/features/newsletter/partilhado/modais/Fontes";
import { FilaEntrada } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";
import { EmailsPage } from "@/newsletter/routes/_authenticated/emails";
import { ModoRecolha } from "@/newsletter/features/definicoes/ModoRecolha";
import { ConfirmacaoExternaHost } from "@/newsletter/shim/confirmar";
import "@/newsletter/newsletter.css";

export default function Curadoria() {
  const [params] = useSearchParams();
  const [separador, setSeparador] = useState(params.get("separador") === "emails" ? "emails" : "noticias");
  // Remounting the list after a batch resets it to «Por rever» with fresh data.
  const [versaoLista, setVersaoLista] = useState(0);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useCurrentUserRoles();
  const fontes = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  const ativas = fontes.data?.filter(f => f.activa).length;
  return <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
    <ConfirmacaoExternaHost />
    <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold">Curadoria</h1>
        {fontes.data && <span className="text-sm text-muted-foreground">{ativas} de {fontes.data.length} fontes ativas</span>}
        {fontes.isError && <span className="text-sm text-destructive">Não foi possível consultar as fontes.</span>}
      </div>
      <Button variant="outline" size="sm" title="RSS, sites e newsletters de onde vêm as notícias" onClick={() => setSeparador("fontes")}>Gerir fontes</Button>
    </header>
    <Tabs value={separador} onValueChange={setSeparador}>
      <TabsList className="mb-4 h-auto flex-wrap justify-start gap-1">
        <TabsTrigger className="min-h-11" value="noticias">Notícias</TabsTrigger>
        <TabsTrigger className="min-h-11" value="emails">Emails</TabsTrigger>
        <TabsTrigger className="min-h-11" value="fontes">Fontes e limites</TabsTrigger>
      </TabsList>
      <TabsContent value="noticias" className="space-y-4">
        <FilaEntrada compacto recolherAntes={isAdmin} onConcluido={(r) => {
          void qc.invalidateQueries();
          setVersaoLista(v => v + 1);
          toast.success(r.noticias > 0 ? `${r.noticias} ${r.noticias === 1 ? "notícia nova" : "notícias novas"} em «Por rever».` : "Processamento concluído, sem notícias novas.");
        }} />
        <CuradoriaNoticias key={versaoLista} />
      </TabsContent>
      <TabsContent value="emails"><EmailsPage embutido /></TabsContent>
      <TabsContent value="fontes" className="space-y-4">
        <div className="overflow-hidden rounded-xl border bg-card">
          <Fontes embutido isAdmin={isAdmin} nomeExibicao={user?.email ?? "Equipa"} notify={(m, opts) => opts?.tipo === "erro" ? toast.error(m) : toast.success(m)} onFechar={() => setSeparador("noticias")} />
        </div>
        {isAdmin && <ModoRecolha />}
        <Button variant="outline" asChild><Link to="/estudio/ligacoes">Ver ligação dos emails e integrações</Link></Button>
      </TabsContent>
    </Tabs>
  </div>;
}
