import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Task } from '@/hooks/useTasks';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { QuickAddTask } from './QuickAddTask';
import { TaskAssigneeFilter } from './TaskAssigneeFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'reporter_id'>) => void;
}

export function KanbanBoard({ tasks, projectId, onUpdateTask, onDeleteTask, onCreateTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = [
    { id: 'todo', title: 'A Fazer', status: 'todo' as const },
    { id: 'in_progress', title: 'Em Progresso', status: 'in_progress' as const },
    { id: 'review', title: 'Revisão', status: 'review' as const },
    { id: 'done', title: 'Concluído', status: 'done' as const },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    
    if (newStatus !== activeTask?.status) {
      onUpdateTask(taskId, { status: newStatus });
    }
    
    setActiveTask(null);
  };

  // Filter tasks based on assignee
  const filteredTasks = tasks.filter((task) => {
    if (assigneeFilter === 'all') return true;
    if (assigneeFilter === 'unassigned') return !task.assignee_id;
    return task.assignee_id === assigneeFilter;
  });

  if (isMobile) {
    return (
      <>
        {/* Quick Add Task and Filter */}
        <div className="mb-4 space-y-3">
          <QuickAddTask projectId={projectId} onCreate={onCreateTask} />
          <TaskAssigneeFilter value={assigneeFilter} onChange={setAssigneeFilter} />
        </div>

        <Tabs defaultValue="todo" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            {columns.map((column) => {
              const columnTasks = filteredTasks.filter((task) => task.status === column.status);
              return (
                <TabsTrigger 
                  key={column.id} 
                  value={column.id}
                  className="flex flex-col gap-1 py-2 px-1 text-xs touch-target"
                >
                  <span className="font-semibold">{column.title}</span>
                  <span className="text-muted-foreground">({columnTasks.length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {columns.map((column) => {
              const columnTasks = filteredTasks.filter((task) => task.status === column.status);
              return (
                <TabsContent key={column.id} value={column.id} className="mt-0">
                  <KanbanColumn
                    id={column.id}
                    title={column.title}
                    status={column.status}
                    tasks={columnTasks}
                    projectId={projectId}
                    allTasks={tasks}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                  />
                </TabsContent>
              );
            })}

            <DragOverlay>
              {activeTask && (
                <div className="opacity-80 rotate-3 scale-105">
                  <TaskCard 
                    task={activeTask} 
                    projectId={projectId}
                    availableTasks={tasks}
                    onUpdate={() => {}} 
                    onDelete={() => {}} 
                    isDragging 
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </Tabs>
      </>
    );
  }

  return (
    <>
      {/* Quick Add Task and Filter */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-center justify-between">
        <QuickAddTask projectId={projectId} onCreate={onCreateTask} />
        <TaskAssigneeFilter value={assigneeFilter} onChange={setAssigneeFilter} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 min-h-[500px] md:min-h-[600px]">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((task) => task.status === column.status);
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                status={column.status}
                tasks={columnTasks}
                projectId={projectId}
                allTasks={tasks}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="opacity-80 rotate-3 scale-105">
              <TaskCard 
                task={activeTask} 
                projectId={projectId}
                availableTasks={tasks}
                onUpdate={() => {}} 
                onDelete={() => {}} 
                isDragging 
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
