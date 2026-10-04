import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { tentarRecarga } from "./lib/recargaBuild";

// Old lazy chunks vanish after a deploy; one persistent-guarded reload per missing asset (see recargaBuild).
window.addEventListener("vite:preloadError", (event) => {
  if (tentarRecarga(localStorage, () => window.location.reload(), (event as Event & { payload?: unknown }).payload)) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
