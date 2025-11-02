import { Task } from '@/hooks/useTasks';
import { useMemo } from 'react';
import { format, differenceInDays, startOfDay, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimelineViewProps {
  tasks: Task[];
}

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export const TimelineView = ({ tasks }: TimelineViewProps) => {
  const timelineData = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.start_date && t.due_date);
    
    if (tasksWithDates.length === 0) {
      return { tasks: [], minDate: new Date(), maxDate: new Date(), totalDays: 0 };
    }

    const dates = tasksWithDates.flatMap(t => [
      new Date(t.start_date!),
      new Date(t.due_date!)
    ]);
    
    const minDate = startOfDay(new Date(Math.min(...dates.map(d => d.getTime()))));
    const maxDate = startOfDay(new Date(Math.max(...dates.map(d => d.getTime()))));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    const tasksPositioned = tasksWithDates.map(task => {
      const startDate = startOfDay(new Date(task.start_date!));
      const endDate = startOfDay(new Date(task.due_date!));
      const startOffset = differenceInDays(startDate, minDate);
      const duration = differenceInDays(endDate, startDate) + 1;
      
      return {
        ...task,
        startOffset,
        duration,
        startDate,
        endDate,
      };
    });

    return { tasks: tasksPositioned, minDate, maxDate, totalDays };
  }, [tasks]);

  if (timelineData.tasks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Adicione datas de início e fim às tarefas para visualizar a timeline
        </p>
      </Card>
    );
  }

  const { tasks: positionedTasks, minDate, totalDays } = timelineData;
  const dayWidth = 40; // pixels per day
  const timelineWidth = totalDays * dayWidth;

  // Generate week markers
  const weekMarkers = [];
  for (let i = 0; i < totalDays; i += 7) {
    const date = addDays(minDate, i);
    weekMarkers.push({
      offset: i * dayWidth,
      label: format(date, 'dd MMM', { locale: pt }),
    });
  }

  return (
    <Card className="p-6">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          {/* Timeline header */}
          <div className="relative mb-4" style={{ width: timelineWidth }}>
            <div className="h-12 border-b relative">
              {weekMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 text-xs text-muted-foreground"
                  style={{ left: marker.offset }}
                >
                  <div className="border-l h-12 pl-2 pt-1">{marker.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {positionedTasks.map((task) => (
              <div key={task.id} className="relative h-12 group">
                {/* Task name on the left */}
                <div className="absolute left-0 top-0 w-48 pr-4 truncate text-sm font-medium z-10">
                  {task.title}
                </div>

                {/* Timeline bar */}
                <div
                  className="absolute top-1 h-10 rounded flex items-center px-3 text-xs font-medium text-white transition-all group-hover:shadow-lg"
                  style={{
                    left: task.startOffset * dayWidth + 200,
                    width: task.duration * dayWidth,
                  }}
                  title={`${format(task.startDate, 'dd/MM/yyyy')} - ${format(task.endDate, 'dd/MM/yyyy')}`}
                >
                  <div className={`absolute inset-0 rounded ${PRIORITY_COLORS[task.priority]} opacity-80`} />
                  <div className="relative z-10 truncate">
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
