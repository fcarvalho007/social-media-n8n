import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HiggsfieldJob, HiggsfieldJobStatus } from '@/lib/higgsfield/types';

interface AIGeneratorProgressProps {
  jobs: HiggsfieldJob[];
  progress: { completed: number; total: number; currentStatus: string };
  onCancel: () => void;
  onCancelJob: (requestId: string) => void;
}

const statusConfig: Record<HiggsfieldJobStatus, { 
  icon: React.ReactNode; 
  label: string; 
  className: string;
}> = {
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Pendente', 
    className: 'text-muted-foreground' 
  },
  queued: { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Em fila', 
    className: 'text-muted-foreground' 
  },
  in_progress: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    label: 'A gerar', 
    className: 'text-primary' 
  },
  completed: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    label: 'Concluído', 
    className: 'text-green-500' 
  },
  failed: { 
    icon: <XCircle className="h-4 w-4" />, 
    label: 'Falhou', 
    className: 'text-destructive' 
  },
  nsfw: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    label: 'Bloqueado', 
    className: 'text-amber-500' 
  },
  cancelled: { 
    icon: <X className="h-4 w-4" />, 
    label: 'Cancelado', 
    className: 'text-muted-foreground' 
  },
  timeout: { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Timeout', 
    className: 'text-amber-500' 
  },
};

export function AIGeneratorProgress({ 
  jobs, 
  progress, 
  onCancel,
  onCancelJob 
}: AIGeneratorProgressProps) {
  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;

  const activeJobs = jobs.filter(j => 
    j.status === 'pending' || j.status === 'queued' || j.status === 'in_progress'
  );

  return (
    <div className="space-y-4">
      {/* Global Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {progress.completed} de {progress.total} concluídas
          </span>
          <span className="text-xs text-muted-foreground">
            {progress.currentStatus}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-3 gap-2">
        {jobs.map((job) => {
          const config = statusConfig[job.status];
          const canCancel = job.status === 'pending' || job.status === 'queued';
          
          return (
            <Card key={job.id} className="relative overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex items-center gap-1", config.className)}>
                      {config.icon}
                    </div>
                    <span className="text-xs font-medium">{job.id}</span>
                  </div>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onCancelJob(job.requestId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn("mt-2 text-xs", config.className)}
                >
                  {config.label}
                </Badge>
                {job.error && (
                  <p className="text-xs text-destructive mt-1 truncate">
                    {job.error}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel Button */}
      {activeJobs.length > 0 && (
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar Tudo
        </Button>
      )}
    </div>
  );
}
