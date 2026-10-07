import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
export default function Curadoria() {
  return <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-4 sm:px-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Curadoria</h1><p className="mt-1 text-sm text-muted-foreground">Uma seleção editorial para todos os conteúdos.</p></div><Button variant="outline" asChild><Link to="/newsletter">Abrir newsletter</Link></Button></div>
    <CuradoriaNoticias />
  </div>;
}
