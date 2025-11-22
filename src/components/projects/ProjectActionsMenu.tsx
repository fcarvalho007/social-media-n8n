import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Archive, Trash2, Save, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectActionsMenuProps {
  onSaveTemplate: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function ProjectActionsMenu({
  onSaveTemplate,
  onEdit,
  onArchive,
  onDelete,
}: ProjectActionsMenuProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              aria-label="Mais ações"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card z-50">
            <DropdownMenuItem onClick={onSaveTemplate} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar como Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar Projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive} className="gap-2">
              <Archive className="h-4 w-4" />
              Arquivar Projeto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="destructive"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={onDelete}
          aria-label="Eliminar projeto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 min-h-[44px]"
        onClick={onSaveTemplate}
      >
        <Save className="h-4 w-4" />
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 min-h-[44px]"
        onClick={onEdit}
      >
        <Edit className="h-4 w-4" />
        Editar
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 min-h-[44px]"
        onClick={onArchive}
      >
        <Archive className="h-4 w-4" />
        Arquivar
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2 min-h-[44px]"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
