import { useState, useEffect } from 'react';
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
  X,
  Timer,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCost } from '@/lib/ai-generator/constants';

interface AIGenerationJob {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  startedAt?: number;
  cost?: number;
}

interface AIGeneratorProgressProps {
  jobs: AIGenerationJob[];
  progress: { completed: number; total: number; currentStatus: string };
  onCancel: () => void;
  modelName?: string;
  estimatedCostPerImage?: number;
}

const statusConfig: Record<string, { 
  icon: React.ReactNode; 
  label: string; 
  className: string;
}> = {
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Em fila', 
    className: 'text-muted-foreground' 
  },
  generating: { 
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
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AIGeneratorProgress({ 
  jobs, 
  progress, 
  onCancel,
  modelName = 'AI',
  estimatedCostPerImage = 0.15,
}: AIGeneratorProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Get start time from first job
  const startTime = jobs.length > 0 ? jobs[0].startedAt : undefined;
  
  // Timer effect
  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  // Reset timer when jobs change
  useEffect(() => {
    if (jobs.length === 0) {
      setElapsedTime(0);
    }
  }, [jobs.length]);

  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;

  const activeJobs = jobs.filter(j => 
    j.status === 'pending' || j.status === 'generating'
  );
  
  const isGenerating = activeJobs.length > 0;
  
  // Estimate remaining time (rough: ~30-60s per image for Nano Banana)
  const estimatedTimePerImage = 45; // seconds
  const remainingImages = progress.total - progress.completed;
  const estimatedRemaining = remainingImages * estimatedTimePerImage;

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 space-y-4">
          {/* Header with animation */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary/10 rounded-full p-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                A gerar {progress.total === 1 ? 'imagem' : `${progress.total} imagens`}...
              </h3>
              <p className="text-sm text-muted-foreground">
                {modelName} • {formatCost(estimatedCostPerImage)}/imagem
              </p>
            </div>
          </div>
          
          {/* Progress bar with percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {progress.completed} de {progress.total}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
          
          {/* Timer and estimate */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-medium">{formatTime(elapsedTime)}</span>
              <span className="text-muted-foreground">decorrido</span>
            </div>
            {isGenerating && remainingImages > 0 && (
              <div className="text-xs text-muted-foreground">
                ~{formatTime(estimatedRemaining)} restante
              </div>
            )}
          </div>

          {/* Current status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progress.currentStatus}</span>
            {isGenerating && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                A processar na fal.ai
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Jobs Grid - only show if multiple */}
      {progress.total > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {jobs.map((job, index) => {
            const config = statusConfig[job.status] || statusConfig.pending;
            
            return (
              <Card 
                key={job.id} 
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  job.status === 'completed' && "border-green-500/30 bg-green-500/5",
                  job.status === 'failed' && "border-destructive/30 bg-destructive/5",
                  job.status === 'generating' && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex items-center", config.className)}>
                      {config.icon}
                    </div>
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <Badge 
                      variant="secondary" 
                      className={cn("ml-auto text-[10px] px-1.5", config.className)}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  {job.error && (
                    <p className="text-[10px] text-destructive mt-1 truncate">
                      {job.error}
                    </p>
                  )}
                  {job.cost && job.status === 'completed' && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatCost(job.cost)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Button */}
      {activeJobs.length > 0 && (
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      )}
    </div>
  );
}