// Mounts the ported original newsletter screens under /newsletter/* with react-router.
import { Route as R, Routes } from "react-router-dom";
import "./newsletter.css";
import { Route as Layout } from "./routes/_authenticated/route";
import { Route as Index } from "./routes/_authenticated/index";
import { Route as Arquivo } from "./routes/_authenticated/arquivo";
import { Route as Briefs } from "./routes/_authenticated/briefs";
import { Route as Custos } from "./routes/_authenticated/custos";
import { Route as Definicoes } from "./routes/_authenticated/definicoes";
import { Route as EdicaoWeb } from "./routes/_authenticated/edicao-web";
import { Route as Passadas } from "./routes/_authenticated/edicoes-passadas";
import { Route as Emails } from "./routes/_authenticated/emails";
import { Route as Ferramentas } from "./routes/_authenticated/ferramentas";
import { Route as PreVis } from "./routes/_authenticated/pre-visualizar.$numero";
import { Route as PreVisBrief } from "./routes/_authenticated/pre-visualizar.brief.$slug";
import NewsletterMigracao from "@/pages/NewsletterMigracao";

type C = { component?: React.ComponentType };
const el = (r: C) => { const Comp = r.component!; return <Comp />; };

export default function NewsletterApp() {
  return (
    <Routes>
      <R element={el(Layout as C)}>
        <R index element={el(Index as C)} />
        <R path="arquivo" element={el(Arquivo as C)} />
        <R path="briefs" element={el(Briefs as C)} />
        <R path="custos" element={el(Custos as C)} />
        <R path="definicoes" element={el(Definicoes as C)} />
        <R path="edicao-web" element={el(EdicaoWeb as C)} />
        <R path="edicoes-passadas" element={el(Passadas as C)} />
        <R path="emails" element={el(Emails as C)} />
        <R path="ferramentas" element={el(Ferramentas as C)} />
        <R path="pre-visualizar/brief/:slug" element={el(PreVisBrief as C)} />
        <R path="pre-visualizar/:numero" element={el(PreVis as C)} />
        <R path="migracao" element={<NewsletterMigracao />} />
      </R>
    </Routes>
  );
}
