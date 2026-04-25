import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const SHORTCUTS: Array<{ section: string; items: ShortcutEntry[] }> = [
  {
    section: 'Acções principais',
    items: [
      { keys: ['⌘', 'Enter'], description: 'Publicar (ou abrir validação se houver erros)' },
      { keys: ['⌘', 'S'], description: 'Guardar rascunho' },
    ],
  },
  {
    section: 'Edição de legenda',
    items: [
      { keys: ['⌘', '/'], description: 'Abrir painel "Ajustar tom"' },
    ],
  },
  {
    section: 'Navegação',
    items: [
      { keys: ['Esc'], description: 'Fechar modal aberto' },
      { keys: ['?'], description: 'Mostrar este painel de atalhos' },
    ],
  },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-border bg-muted px-2 font-mono text-xs font-medium text-foreground shadow-sm">
    {children}
  </kbd>
);

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Acelera o teu fluxo no editor com estas combinações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.section} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.section}
              </h3>
              <ul className="space-y-2">
                {group.items.map((shortcut) => (
                  <li key={shortcut.description} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{shortcut.description}</span>
                    <span className="flex items-center gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={`${shortcut.description}-${idx}`} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-xs text-muted-foreground">+</span>}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Em Windows/Linux, usa <span className="font-mono">Ctrl</span> em vez de <span className="font-mono">⌘</span>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
