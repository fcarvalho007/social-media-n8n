import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// After a new deploy, old lazy chunks (JS/CSS) disappear. Reload once to fetch the current build
// instead of showing the error boundary; a session flag prevents reload loops.
window.addEventListener("vite:preloadError", (event) => {
  const chave = "recarga-preload";
  const ultima = Number(sessionStorage.getItem(chave) ?? 0);
  if (Date.now() - ultima < 30_000) return;
  event.preventDefault();
  sessionStorage.setItem(chave, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
