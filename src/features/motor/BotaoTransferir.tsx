import { useState, type ReactNode } from "react";
import { AlertCircle, Download, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkDescarga, transferirFicheiro } from "@/lib/transferirFicheiro";

/** Download with loading, error, retry and a direct-attachment fallback link. No new tab. */
export function BotaoTransferir({ url, nome, children, compacto = false }: { url: string; nome: string; children: ReactNode; compacto?: boolean }) {
  const [estado, setEstado] = useState<"livre" | "a_transferir" | "erro">("livre");
  const [detalhe, setDetalhe] = useState("");
  const transferir = async () => {
    setEstado("a_transferir");
    const r = await transferirFicheiro(url, nome);
    if (r.ok === true) { setEstado("livre"); return; }
    setDetalhe(r.motivo === "rede" ? "O navegador ou uma extensão bloqueou o pedido." : r.detalhe);
    setEstado("erro");
  };
  return (
    <div className="space-y-1">
      <Button type="button" variant={compacto ? "link" : "outline"} className={compacto ? "h-auto min-h-11 p-0 text-xs" : "h-11 w-full justify-start"} onClick={transferir} disabled={estado === "a_transferir"}>
        {estado === "a_transferir" ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : estado === "erro" ? <RotateCw className="mr-2 h-4 w-4" /> : !compacto && <Download className="mr-2 h-4 w-4" />}
        {children}
      </Button>
      {estado === "erro" && (
        <p role="alert" className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          Não foi possível transferir. {detalhe}
          <a className="underline" href={linkDescarga(url, nome)} download={nome}>Transferir diretamente</a>
        </p>
      )}
    </div>
  );
}
