import { createRoot } from "react-dom/client";
import App from "../App";
import "../index.css";
import "./hubPreview.css";

function HubPreview() {
  if (!import.meta.env.DEV || import.meta.env.MODE !== "hub") return <p>A demonstração da plataforma só está disponível no servidor local.</p>;
  return <>
    <aside className="hub-local-banner" aria-label="Modo de demonstração local">
      <strong>Demonstração local</strong>
      <span>Dados locais · sem publicação · serviços pagos sujeitos a autorização</span>
    </aside>
    <App />
  </>;
}

createRoot(document.getElementById("root")!).render(<HubPreview />);
