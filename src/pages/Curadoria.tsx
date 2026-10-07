import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";
import { listarFontes } from "@/newsletter/features/newsletter/data";
import { Fontes } from "@/newsletter/features/newsletter/partilhado/modais/Fontes";
import { FilaEntrada } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";
import { ModoRecolha } from "@/newsletter/features/definicoes/ModoRecolha";
import { ConfirmacaoExternaHost } from "@/newsletter/shim/confirmar";
import "@/newsletter/newsletter.css";

export default function Curadoria() {
  const [separador, setSeparador] = useState("noticias");
  const { user } = useAuth();
  const { isAdmin } = useCurrentUserRoles();
  const fontes = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  return <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
    <ConfirmacaoExternaHost />
    <header>
      <h1 className="text-2xl font-semibold">Curadoria</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Revê uma vez e reutiliza as notícias aprovadas na newsletter e nas redes sociais.</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
      <p className="max-w-prose text-sm text-muted-foreground">As notícias vêm dos RSS, sites e newsletters que configuraste aqui. Em modo manual, passam pela fila de entrada antes da revisão.
        {fontes.data && <span className="mt-1 block font-medium text-foreground">{fontes.data.filter(f => f.activa).length} de {fontes.data.length} fontes ativas.</span>}
        {fontes.isError && <span className="mt-1 block text-destructive">Não foi possível consultar as fontes. Abre «Fontes e limites» para tentar novamente.</span>}
      </p>
      <Button variant="outline" onClick={() => setSeparador("fontes")}>Gerir fontes e RSS</Button>
    </div>
    <Tabs value={separador} onValueChange={setSeparador}>
      <TabsList className="mb-5 h-auto flex-wrap justify-start gap-1">
        <TabsTrigger className="min-h-11" value="noticias">Notícias</TabsTrigger>
        <TabsTrigger className="min-h-11" value="fontes">Fontes e limites</TabsTrigger>
        <TabsTrigger className="min-h-11" value="fila">Fila de entrada</TabsTrigger>
      </TabsList>
      <TabsContent value="noticias"><CuradoriaNoticias /></TabsContent>
      <TabsContent value="fontes" className="overflow-hidden rounded-xl border bg-white">
        <Fontes embutido isAdmin={isAdmin} nomeExibicao={user?.email ?? "Equipa"} notify={(m, opts) => opts?.tipo === "erro" ? toast.error(m) : toast.success(m)} onFechar={() => setSeparador("noticias")} />
      </TabsContent>
      <TabsContent value="fila" className="space-y-4">
        <p className="max-w-prose text-sm text-muted-foreground">Processa um lote para transformar os conteúdos recolhidos em notícias. Depois, revê-os no separador «Notícias». O processamento usa IA; abrir esta página não inicia nenhum pedido.</p>
        <FilaEntrada />
        {isAdmin && <ModoRecolha />}
        <Button variant="outline" asChild><Link to="/estudio/ligacoes">Ver ligação dos emails e integrações</Link></Button>
      </TabsContent>
    </Tabs>
  </div>;
}
