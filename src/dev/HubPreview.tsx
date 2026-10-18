import { createRoot } from "react-dom/client";
import App from "../App";
import "../index.css";
import "./hubPreview.css";

function HubPreview() {
  if (!import.meta.env.DEV || import.meta.env.MODE !== "hub") return <p>A demonstração da plataforma só está disponível no servidor local.</p>;
  return <>
    <aside className="hub-local-banner" aria-label="Modo de demonstração local">
      <strong>Demonstração local</strong>
      <span>Dados fictícios · alterações só neste navegador · envios, Cloud e IA paga desligados</span>
      <a href="/">Painel</a><a href="/curadoria">Curadoria</a><a href="/drafts">Rascunhos</a><a href="/calendar">Calendário</a><a href="/artigos">Artigos</a>
    </aside>
    <App />
  </>;
}

createRoot(document.getElementById("root")!).render(<HubPreview />);
