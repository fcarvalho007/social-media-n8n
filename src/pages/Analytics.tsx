import { useState } from "react";
import { BarChart3, RefreshCw, Trash2, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KPICards } from "@/components/analytics/KPICards";
import { EngagementChart } from "@/components/analytics/EngagementChart";
import { ContentTypeBreakdown } from "@/components/analytics/ContentTypeBreakdown";
import { HashtagCloud } from "@/components/analytics/HashtagCloud";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import { ImportInstagramExcel } from "@/components/analytics/ImportInstagramExcel";
import { useInstagramAnalytics } from "@/hooks/useInstagramAnalytics";
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
} from "@/components/ui/alert-dialog";

export default function Analytics() {
  const {
    analytics,
    stats,
    isLoading,
    importPosts,
    isImporting,
    deleteAnalytics,
    isDeleting,
  } = useInstagramAnalytics();

  const handleDeleteAll = () => {
    const ids = analytics.map((a) => a.id);
    if (ids.length > 0) {
      deleteAnalytics(ids);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const isEmpty = analytics.length === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics Instagram</h1>
            <p className="text-sm text-muted-foreground">
              {isEmpty
                ? "Importe os dados das suas publicações para começar"
                : `${stats.totalPosts} publicações analisadas`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ImportInstagramExcel
            onImport={importPosts}
            isImporting={isImporting}
          />
          {!isEmpty && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação vai eliminar todos os {stats.totalPosts} registos de analytics.
                    Esta ação não pode ser revertida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar Tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isEmpty ? (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sem dados de analytics</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Importe um ficheiro Excel com os dados das suas publicações do Instagram
              para ver métricas detalhadas, gráficos e insights.
            </p>
            <ImportInstagramExcel
              onImport={importPosts}
              isImporting={isImporting}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <KPICards stats={stats} />

          {/* Best Post Highlight */}
          {stats.bestPost && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Melhor Post
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                {stats.bestPost.thumbnail_url && (
                  <img
                    src={stats.bestPost.thumbnail_url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2 mb-2">
                    {stats.bestPost.caption?.substring(0, 150) || "Sem legenda"}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                      ❤️ {stats.bestPost.likes_count.toLocaleString()} likes
                    </Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      💬 {stats.bestPost.comments_count.toLocaleString()} comentários
                    </Badge>
                    <Badge variant="outline">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {(stats.bestPost.likes_count + stats.bestPost.comments_count).toLocaleString()} engagement
                    </Badge>
                  </div>
                </div>
                <a
                  href={stats.bestPost.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm whitespace-nowrap"
                >
                  Ver post →
                </a>
              </CardContent>
            </Card>
          )}

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <EngagementChart data={stats.engagementOverTime} />
            <ContentTypeBreakdown data={stats.contentTypeBreakdown} />
          </div>

          {/* Hashtags */}
          <HashtagCloud data={stats.topHashtags} />

          {/* Posts Table */}
          <TopPostsTable posts={analytics} />
        </>
      )}
    </div>
  );
}
