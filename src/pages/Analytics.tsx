import { useState, useMemo } from "react";
import { BarChart3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "@/components/analytics/KPICards";
import { EngagementChart } from "@/components/analytics/EngagementChart";
import { ContentTypeBreakdown } from "@/components/analytics/ContentTypeBreakdown";
import { HashtagCloud } from "@/components/analytics/HashtagCloud";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import { TopPostsGallery } from "@/components/analytics/TopPostsGallery";
import { BestTimeToPost } from "@/components/analytics/BestTimeToPost";
import { InsightsSummary } from "@/components/analytics/InsightsSummary";
import { AnalyticsFilters, type PeriodFilter, type ContentTypeFilter } from "@/components/analytics/AnalyticsFilters";
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

  // Filters state
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [account, setAccount] = useState("all");
  const [contentTypes, setContentTypes] = useState<ContentTypeFilter[]>(["Image", "Video", "Sidecar"]);

  // Get unique accounts
  const accounts = useMemo(() => {
    const usernames = new Set<string>();
    analytics.forEach((p) => {
      if (p.owner_username) usernames.add(p.owner_username);
    });
    return Array.from(usernames);
  }, [analytics]);

  // Filter analytics data
  const filteredAnalytics = useMemo(() => {
    let result = [...analytics];

    // Period filter
    if (period !== "all") {
      const now = new Date();
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((p) => p.posted_at && new Date(p.posted_at) >= cutoff);
    }

    // Account filter
    if (account !== "all") {
      result = result.filter((p) => p.owner_username === account);
    }

    // Content type filter
    if (contentTypes.length < 3) {
      result = result.filter((p) => contentTypes.includes((p.post_type || "Image") as ContentTypeFilter));
    }

    return result;
  }, [analytics, period, account, contentTypes]);

  const handleResetFilters = () => {
    setPeriod("all");
    setAccount("all");
    setContentTypes(["Image", "Video", "Sidecar"]);
  };

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
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const isEmpty = analytics.length === 0;

  return (
    <div className="container mx-auto p-6 space-y-5">
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
                ? "Importe os dados das suas publicações"
                : `${stats.totalPosts} publicações analisadas`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ImportInstagramExcel onImport={importPosts} isImporting={isImporting} />
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
                    Esta ação vai eliminar todos os {stats.totalPosts} registos.
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sem dados de analytics</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Importe um ficheiro Excel com os dados das suas publicações do Instagram.
            </p>
            <ImportInstagramExcel onImport={importPosts} isImporting={isImporting} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <AnalyticsFilters
            period={period}
            onPeriodChange={setPeriod}
            account={account}
            onAccountChange={setAccount}
            accounts={accounts}
            contentTypes={contentTypes}
            onContentTypesChange={setContentTypes}
            onReset={handleResetFilters}
            totalPosts={analytics.length}
            filteredPosts={filteredAnalytics.length}
          />

          {/* Insights */}
          <InsightsSummary stats={stats} analytics={filteredAnalytics} />

          {/* KPI Cards */}
          <KPICards stats={stats} />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <EngagementChart data={stats.engagementOverTime} />
                <ContentTypeBreakdown data={stats.contentTypeBreakdown} />
              </div>
              <TopPostsGallery posts={filteredAnalytics} limit={3} />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <EngagementChart data={stats.engagementOverTime} />
              <BestTimeToPost analytics={filteredAnalytics} />
            </TabsContent>

            <TabsContent value="hashtags">
              <HashtagCloud data={stats.topHashtags} />
            </TabsContent>

            <TabsContent value="posts">
              <TopPostsTable posts={filteredAnalytics} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
