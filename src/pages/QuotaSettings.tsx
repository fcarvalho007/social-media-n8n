import { useState, useEffect } from 'react';
import { QuotaManagement } from '@/components/QuotaManagement';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { RefreshCw, Trash2, HardDrive, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function QuotaSettings() {
  const { refetch } = usePublishingQuota();
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const handleQuotaChange = () => {
    refetch();
  };

  // Auto dry-run on mount to show storage status
  useEffect(() => {
    loadStorageStatus();
  }, []);

  const loadStorageStatus = async () => {
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-storage', {
        body: { dryRun: true },
      });
      if (!error && data) {
        setStorageStatus(data);
      }
    } catch {
      // silent
    } finally {
      setStatusLoading(false);
    }
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
      setStorageStatus(data);
      if (dryRun) {
        toast.info(`Análise concluída: ${data.filesToDelete} ficheiros podem ser eliminados`);
      } else {
        toast.success(`Limpeza concluída: ${data.filesToDelete} ficheiros processados`);
        // Refresh status after cleanup
        setTimeout(() => loadStorageStatus(), 2000);
      }
    } catch (err) {
      toast.error('Erro de rede');
    } finally {
      setCleanupLoading(false);
    }
  };

  const totalBytes = storageStatus?.results?.totalStorageBytes || 0;
  const freedBytes = storageStatus?.results?.freedBytes || 0;
  const usedAfterCleanup = totalBytes - freedBytes;
  const cleanupPercentage = totalBytes > 0 ? Math.round((freedBytes / totalBytes) * 100) : 0;

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

      {/* Retention Policy Alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <Clock className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-semibold">Política de retenção: 7 dias</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Todos os ficheiros (imagens, vídeos e PDFs) são automaticamente eliminados após 7 dias para manter o sistema sustentável. Faça download do conteúdo que pretende guardar antes desse prazo.
        </AlertDescription>
      </Alert>

      {/* Storage Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Estado do Storage
          </CardTitle>
          <CardDescription>
            Resumo actual do espaço utilizado na Cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              A carregar estado do storage…
            </div>
          ) : storageStatus ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatBytes(totalBytes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total utilizado</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{formatBytes(freedBytes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Eliminável ({cleanupPercentage}%)</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{formatBytes(usedAfterCleanup)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Após limpeza</p>
                </div>
              </div>

              {freedBytes > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Espaço recuperável</span>
                    <span>{cleanupPercentage}%</span>
                  </div>
                  <Progress value={cleanupPercentage} className="h-2" />
                </div>
              )}

              {storageStatus.storageInfo && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(storageStatus.storageInfo).map(([bucket, info]: any) => (
                    <Badge key={bucket} variant="outline" className="text-xs">
                      {bucket}: {info.fileCount} ficheiros ({formatBytes(info.totalBytes)})
                    </Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível carregar o estado do storage.</p>
          )}
        </CardContent>
      </Card>

      {/* Storage Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Limpeza de Storage
          </CardTitle>
          <CardDescription>
            Elimine ficheiros com mais de 7 dias (posts falhados, publicados e ficheiros órfãos) para poupar espaço na Cloud.
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={cleanupLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Executar Limpeza
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar limpeza de storage</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Esta acção irá eliminar permanentemente todos os ficheiros com mais de 7 dias
                      dos buckets de storage (imagens, vídeos e PDFs).
                    </p>
                    {storageStatus && (
                      <p className="font-medium text-foreground">
                        Serão eliminados aproximadamente {storageStatus.filesToDelete || 0} ficheiros,
                        libertando ~{formatBytes(freedBytes)}.
                      </p>
                    )}
                    <p className="text-destructive font-semibold">
                      Esta acção é irreversível.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => runCleanup(false)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, eliminar ficheiros
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
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
                <div>
                  <span className="text-muted-foreground">Espaço a libertar:</span>
                  <Badge variant="destructive" className="ml-2">{formatBytes(cleanupResult.results?.freedBytes || 0)}</Badge>
                </div>
              </div>

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
