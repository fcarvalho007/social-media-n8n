// Concrete confirmation dialog for external newsletter actions (send, publish, subscriber changes).
// The client shim awaits this before sending the confirmation token to nl-api.
import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Pedido { texto: string; resolver: (ok: boolean) => void }
let ouvinte: ((p: Pedido) => void) | null = null;

export function pedirConfirmacao(texto: string): Promise<boolean> {
  return new Promise((resolver) => {
    if (!ouvinte) return resolver(false); // no host mounted: never proceed silently
    ouvinte({ texto, resolver });
  });
}

export function ConfirmacaoExternaHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  useEffect(() => {
    ouvinte = setPedido;
    return () => { ouvinte = null; };
  }, []);
  const fechar = (ok: boolean) => { pedido?.resolver(ok); setPedido(null); };
  return (
    <AlertDialog open={!!pedido} onOpenChange={(o) => { if (!o) fechar(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar ação externa</AlertDialogTitle>
          <AlertDialogDescription>{pedido?.texto}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => fechar(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => fechar(true)}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
