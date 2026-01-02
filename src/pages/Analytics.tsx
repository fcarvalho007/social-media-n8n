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
import { DataContextBadge } from "@/components/analytics/DataContextBadge";
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

  // Recalculate stats for filtered data
  const filteredStats = useMemo(() => {
    if (filteredAnalytics.length === 0) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        avgLikes: 0,
        avgComments: 0,
        avgEngagement: 0,
        bestPost: null,
        worstPost: null,
        topHashtags: [],
        contentTypeBreakdown: [],
        engagementOverTime: [],
      };
    }

    const totalLikes = filteredAnalytics.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = filteredAnalytics.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalViews = filteredAnalytics.reduce((sum, p) => sum + (p.views_count || 0), 0);

    const sorted = [...filteredAnalytics].sort(
      (a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count)
    );

    // Hashtag analysis
    const hashtagMap = new Map<string, { count: number; totalLikes: number }>();
    filteredAnalytics.forEach((post) => {
      (post.hashtags || []).forEach((tag) => {
        const existing = hashtagMap.get(tag) || { count: 0, totalLikes: 0 };
        hashtagMap.set(tag, {
          count: existing.count + 1,
          totalLikes: existing.totalLikes + (post.likes_count || 0),
        });
      });
    });

    const topHashtags = Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgLikes: Math.round(data.totalLikes / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Content type breakdown
    const typeMap = new Map<string, { count: number; totalEngagement: number }>();
    filteredAnalytics.forEach((post) => {
      const type = post.post_type || "Image";
      const existing = typeMap.get(type) || { count: 0, totalEngagement: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + (post.likes_count || 0) + (post.comments_count || 0),
      });
    });

    const contentTypeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgEngagement: Math.round(data.totalEngagement / data.count),
    }));

    // Engagement over time
    const timeMap = new Map<string, { likes: number; comments: number; posts: number }>();
    filteredAnalytics.forEach((post) => {
      if (!post.posted_at) return;
      const date = new Date(post.posted_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = timeMap.get(key) || { likes: 0, comments: 0, posts: 0 };
      timeMap.set(key, {
        likes: existing.likes + (post.likes_count || 0),
        comments: existing.comments + (post.comments_count || 0),
        posts: existing.posts + 1,
      });
    });

    const engagementOverTime = Array.from(timeMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPosts: filteredAnalytics.length,
      totalLikes,
      totalComments,
      totalViews,
      avgLikes: Math.round(totalLikes / filteredAnalytics.length),
      avgComments: Math.round(totalComments / filteredAnalytics.length),
      avgEngagement: Math.round((totalLikes + totalComments) / filteredAnalytics.length),
      bestPost: sorted[0] || null,
      worstPost: sorted[sorted.length - 1] || null,
      topHashtags,
      contentTypeBreakdown,
      engagementOverTime,
    };
  }, [filteredAnalytics]);

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
                : `${filteredStats.totalPosts} publicações analisadas`}
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
          {/* Data Context Badge */}
          <DataContextBadge analytics={analytics} />

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
          <InsightsSummary stats={filteredStats} analytics={filteredAnalytics} />

          {/* KPI Cards */}
          <KPICards stats={filteredStats} />

          {/* Consolidated Tabs: Overview + All Posts */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="posts">Todos os Posts ({filteredAnalytics.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Main charts row */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <EngagementChart data={filteredStats.engagementOverTime} />
                </div>
                <div className="space-y-6">
                  <ContentTypeBreakdown data={filteredStats.contentTypeBreakdown} />
                </div>
              </div>

              {/* Top Posts Gallery */}
              <TopPostsGallery posts={filteredAnalytics} limit={6} />

              {/* Hashtags and Best Time */}
              <div className="grid lg:grid-cols-2 gap-6">
                <HashtagCloud data={filteredStats.topHashtags} />
                <BestTimeToPost analytics={filteredAnalytics} />
              </div>
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
