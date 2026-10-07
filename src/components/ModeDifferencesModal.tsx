import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ModeDifferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ModeDifferencesModal = ({ open, onOpenChange }: ModeDifferencesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Escolher o modo certo</DialogTitle>
          <DialogDescription>
            Compare os dois percursos antes de começar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-bold text-sm text-muted-foreground uppercase tracking-wide">
                    Aspeto
                  </th>
                  <th className="text-left p-3 font-bold text-sm text-primary">
                    Manual
                  </th>
                  <th className="text-left p-3 font-bold text-sm text-accent">
                    Assistido por IA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Ritmo de criação</td>
                  <td className="p-3 text-sm">Controlo passo a passo</td>
                  <td className="p-3 text-sm">Estrutura e composição assistidas</td>
                </tr>
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Entrada de dados</td>
                  <td className="p-3 text-sm">Texto e ficheiros próprios</td>
                  <td className="p-3 text-sm">Texto, ligação, PDF ou curadoria</td>
                </tr>
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Edição</td>
                  <td className="p-3 text-sm">Campo a campo</td>
                  <td className="p-3 text-sm">Compositor visual totalmente editável</td>
                </tr>
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Pré-visualizações por rede</td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-primary inline" /> Ambos
                  </td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-accent inline" /> Ambos
                  </td>
                </tr>
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Validações por rede</td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-primary inline" /> Ambos (com alertas no Manual)
                  </td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-accent inline" /> Ambos
                  </td>
                </tr>
                <tr className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-semibold text-sm">Aprovação/Agenda</td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-primary inline" /> Ambos
                  </td>
                  <td className="p-3 text-sm">
                    <Check className="h-4 w-4 text-accent inline" /> Ambos
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => onOpenChange(false)}
              size="lg"
              className="px-8"
            >
              Percebi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
