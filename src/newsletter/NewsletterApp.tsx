// Mounts the ported original newsletter screens under /newsletter/* with react-router.
// The layout loads eagerly; each screen is code-split so /newsletter only fetches what is opened.
import { lazy, Suspense, type ComponentType } from "react";
import { Route as R, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import "./newsletter.css";
import { Route as Layout } from "./routes/_authenticated/route";
import { ConfirmacaoExternaHost } from "./shim/confirmar";

type C = { component?: ComponentType };
const el = (r: C) => { const Comp = r.component!; return <Comp />; };

const ecra = (load: () => Promise<{ Route: unknown }>) =>
  lazy(async () => {
    const m = await load();
    return { default: (m.Route as C).component! };
  });

const Index = ecra(() => import("./routes/_authenticated/index"));
const Arquivo = ecra(() => import("./routes/_authenticated/arquivo"));
const Briefs = ecra(() => import("./routes/_authenticated/briefs"));
const Custos = ecra(() => import("./routes/_authenticated/custos"));
const Definicoes = ecra(() => import("./routes/_authenticated/definicoes"));
const EdicaoWeb = ecra(() => import("./routes/_authenticated/edicao-web"));
const Passadas = ecra(() => import("./routes/_authenticated/edicoes-passadas"));
const Emails = ecra(() => import("./routes/_authenticated/emails"));
const Ferramentas = ecra(() => import("./routes/_authenticated/ferramentas"));
const PreVis = ecra(() => import("./routes/_authenticated/pre-visualizar.$numero"));
const PreVisBrief = ecra(() => import("./routes/_authenticated/pre-visualizar.brief.$slug"));
const NewsletterMigracao = lazy(() => import("@/pages/NewsletterMigracao"));

const ACarregar = () => (
  <div className="flex justify-center py-16 text-muted-foreground" role="status" aria-label="A carregar">
    <Loader2 className="size-5 animate-spin" />
  </div>
);
const S = (Comp: ComponentType) => <Suspense fallback={<ACarregar />}><Comp /></Suspense>;

export default function NewsletterApp() {
  return (
    <>
    <ConfirmacaoExternaHost />
    <Routes>
      <R element={el(Layout as C)}>
        <R index element={S(Index)} />
        <R path="arquivo" element={S(Arquivo)} />
        <R path="briefs" element={S(Briefs)} />
        <R path="custos" element={S(Custos)} />
        <R path="definicoes" element={S(Definicoes)} />
        <R path="edicao-web" element={S(EdicaoWeb)} />
        <R path="edicoes-passadas" element={S(Passadas)} />
        <R path="emails" element={S(Emails)} />
        <R path="ferramentas" element={S(Ferramentas)} />
        <R path="pre-visualizar/brief/:slug" element={S(PreVisBrief)} />
        <R path="pre-visualizar/:numero" element={S(PreVis)} />
        <R path="migracao" element={S(NewsletterMigracao)} />
      </R>
    </Routes>
    </>
  );
}
