import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Task } from '@/hooks/useTasks';

interface QuickAddTaskProps {
  projectId: string;
  onCreate: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'reporter_id'>) => void;
}

export function QuickAddTask({ projectId, onCreate }: QuickAddTaskProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate({
        project_id: projectId,
        title: title.trim(),
        description: null,
        status: 'todo',
        priority: 'medium',
        assignee_id: null,
        due_date: null,
        start_date: null,
        estimated_hours: null,
      });
      setTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTitle('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        onClick={() => setIsAdding(true)}
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-all min-h-[44px] touch-target"
        aria-label="Adicionar tarefa rápida"
      >
        <Plus className="h-4 w-4" />
        Adicionar tarefa...
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-slide-in-right w-full">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Título da tarefa (Enter para criar, Esc para cancelar)"
          autoFocus
          className="flex-1 min-h-[44px]"
          aria-label="Título da nova tarefa"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!title.trim()} 
          aria-label="Confirmar"
          className="min-h-[44px] min-w-[44px] touch-target"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setTitle('');
            setIsAdding(false);
          }}
          aria-label="Cancelar"
          className="min-h-[44px] min-w-[44px] touch-target"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
