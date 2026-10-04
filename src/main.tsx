import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { tentarRecarga } from "./lib/recargaBuild";

// Old lazy chunks vanish after a deploy; reload once per window (see recargaBuild) instead of failing.
window.addEventListener("vite:preloadError", (event) => {
  if (tentarRecarga(sessionStorage, () => window.location.reload())) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
