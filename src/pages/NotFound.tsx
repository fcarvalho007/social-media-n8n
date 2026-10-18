import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
    <div className="flex max-w-md flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Esta página não está disponível</h1>
      <p className="text-muted-foreground">A ligação pode estar incompleta ou a página pode ter mudado de endereço. Abre o painel para continuar o teu trabalho.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/"><Home aria-hidden="true" />Abrir painel</Link></Button>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft aria-hidden="true" />Voltar</Button>
      </div>
      <span className="text-xs text-muted-foreground">Erro 404</span>
    </div>
  </main>;
}
