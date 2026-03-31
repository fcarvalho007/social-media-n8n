import { useState } from 'react';
import { QuotaManagement } from '@/components/QuotaManagement';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { RefreshCw, Trash2, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function QuotaSettings() {
  const { refetch } = usePublishingQuota();
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const handleQuotaChange = () => {
    refetch();
  };

  const runCleanup = async (dryRun: boolean) => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-storage', {
        body: { dryRun },
      });

      if (error) {
        toast.error('Erro ao executar limpeza');
        console.error(error);
        return;
      }

      setCleanupResult(data);
      if (dryRun) {
        toast.info(`Análise concluída: ${data.filesToDelete} ficheiros podem ser eliminados`);
      } else {
        toast.success(`Limpeza concluída: ${data.filesToDelete} ficheiros processados`);
      }
    } catch (err) {
      toast.error('Erro de rede');
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            Configurações de Quota
          </h1>
          <p className="text-muted-foreground mt-2 ml-[60px]">
            Gerencie manualmente a quota de publicações das suas plataformas
          </p>
        </div>
      </div>

      {/* Quota Management Component */}
      <QuotaManagement onQuotaChange={handleQuotaChange} />

      {/* Storage Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Limpeza de Storage
          </CardTitle>
          <CardDescription>
            Elimine ficheiros antigos de posts falhados (&gt;30 dias) e publicados (&gt;90 dias) para poupar espaço no Cloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => runCleanup(true)}
              disabled={cleanupLoading}
            >
              {cleanupLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <HardDrive className="h-4 w-4 mr-2" />
              )}
              Analisar (sem eliminar)
            </Button>
            <Button
              variant="destructive"
              onClick={() => runCleanup(false)}
              disabled={cleanupLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Executar Limpeza
            </Button>
          </div>

          {cleanupResult && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {cleanupResult.dryRun ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {cleanupResult.dryRun ? 'Resultado da análise' : 'Limpeza concluída'}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Posts falhados:</span>
                  <Badge variant="secondary" className="ml-2">{cleanupResult.posts?.failed || 0}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Posts publicados:</span>
                  <Badge variant="secondary" className="ml-2">{cleanupResult.posts?.published || 0}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Ficheiros a eliminar:</span>
                  <Badge variant="destructive" className="ml-2">{cleanupResult.filesToDelete || 0}</Badge>
                </div>
              </div>

              {cleanupResult.storageInfo && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Ficheiros por bucket:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(cleanupResult.storageInfo).map(([bucket, info]: any) => (
                      <Badge key={bucket} variant="outline" className="text-xs">
                        {bucket}: {info.fileCount} ficheiros
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {cleanupResult.results?.errors?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-destructive">Erros: {cleanupResult.results.errors.join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
