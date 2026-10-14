import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import CarrosselCronica from "@/pages/CarrosselCronica";
import "@/index.css";
function Preview() {
  if (!import.meta.env.DEV || import.meta.env.MODE !== "divulgacao") return <p>Pré-visualização disponível apenas em desenvolvimento local.</p>;
  return <BrowserRouter><div className="min-h-screen bg-background text-foreground"><div className="border-b bg-muted px-4 py-3 text-center text-sm">Demonstração local da edição 319 · dados de teste · envios, IA paga e publicações desligados</div><Routes><Route path="/estudio/redes-sociais/:id" element={<CarrosselCronica />} /></Routes></div><Toaster /></BrowserRouter>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
