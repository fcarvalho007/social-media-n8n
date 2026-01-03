import { useState, useMemo, useCallback } from "react";
import { BarChart3, Trash2, Users, UserCircle, Download, Clock, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "@/components/analytics/KPICards";
import { EngagementChart } from "@/components/analytics/EngagementChart";
import { ContentTypeBreakdown } from "@/components/analytics/ContentTypeBreakdown";
import { HashtagCloud } from "@/components/analytics/HashtagCloud";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import { TopPostsGallery } from "@/components/analytics/TopPostsGallery";
import { BestTimeToPost } from "@/components/analytics/BestTimeToPost";
import { ProfileOverviewCard } from "@/components/analytics/ProfileOverviewCard";
import { CaptionAnalysis } from "@/components/analytics/CaptionAnalysis";
import { AnalyticsSidebar } from "@/components/analytics/AnalyticsSidebar";
import { DataContextBadge } from "@/components/analytics/DataContextBadge";
import { AnalyticsFilters, type PeriodFilter, type ContentTypeFilter } from "@/components/analytics/AnalyticsFilters";
import { DataImportHub } from "@/components/analytics/DataImportHub";
import { SmartSearch } from "@/components/analytics/SmartSearch";
import { PostDetailDrawer } from "@/components/analytics/PostDetailDrawer";
import { AIInsights } from "@/components/analytics/AIInsights";
import { useInstagramAnalytics, type InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import { useAnalyticsBookmarks } from "@/hooks/useAnalyticsBookmarks";
import { AccountSelector } from "@/components/analytics/AccountSelector";
import { AccountRanking, type AccountStats } from "@/components/analytics/AccountRanking";
import { AccountComparisonChart } from "@/components/analytics/AccountComparisonChart";
import { MultiAccountTimeline } from "@/components/analytics/MultiAccountTimeline";
import { CompetitorTopPosts } from "@/components/analytics/CompetitorTopPosts";
import { ContentTypeComparison } from "@/components/analytics/ContentTypeComparison";
import { HashtagComparison } from "@/components/analytics/HashtagComparison";
import { CompetitiveInsights } from "@/components/analytics/CompetitiveInsights";
import { PostingFrequencyHeatmap } from "@/components/analytics/PostingFrequencyHeatmap";
import { EngagementDistribution } from "@/components/analytics/EngagementDistribution";
import { CompetitorReportGenerator } from "@/components/analytics/CompetitorReportGenerator";
import { useInstagramProfiles } from "@/hooks/useInstagramProfiles";
import { ProfileComparisonCards } from "@/components/analytics/ProfileComparisonCards";
import { ProfileKPICards } from "@/components/analytics/ProfileKPICards";
import { FollowersChart } from "@/components/analytics/FollowersChart";
import { ProfilesTable } from "@/components/analytics/ProfilesTable";
import { BioAnalysis } from "@/components/analytics/BioAnalysis";
import { ProfileReportGenerator } from "@/components/analytics/ProfileReportGenerator";
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
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Admin emails allowed to manage data (import/delete)
  const ADMIN_EMAILS = ["frederico.m.carvalho@gmail.com"];
  const canManageData = user?.email && ADMIN_EMAILS.includes(user.email);
  
  const {
    analytics,
    stats,
    isLoading,
    importPosts,
    isImporting,
    deleteAnalytics,
    isDeleting,
  } = useInstagramAnalytics({ publicMode: true });

  // Bookmarks hook
  const { isBookmarked, toggleBookmark } = useAnalyticsBookmarks();

  // Profiles data
  const {
    profiles: allProfiles,
    latestProfiles,
    isLoading: isLoadingProfiles,
  } = useInstagramProfiles({ publicMode: true });

  // Filters state
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [account, setAccount] = useState("all");
  const [contentTypes, setContentTypes] = useState<ContentTypeFilter[]>(["Image", "Video", "Sidecar"]);
  
  // Post detail drawer state
  const [selectedPost, setSelectedPost] = useState<InstagramAnalyticsItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Competition tab state
  const MY_ACCOUNT_USERNAME = "frederico.m.carvalho";
  const [selectedCompetitorAccounts, setSelectedCompetitorAccounts] = useState<string[]>([]);
  const [myAccount, setMyAccount] = useState<string | null>(MY_ACCOUNT_USERNAME);

  // Contas permitidas (principal + 7 concorrentes)
  const ALLOWED_ACCOUNTS = [
    'frederico.m.carvalho',
    'mariiana.ai',
    'marcogouveia.pt',
    'martimsilvai',
    'robs.cortez',
    'escolamarketingdigital.pt',
    'paulofaustino',
    'samurairt'
  ];

  // Handle post selection from search or gallery
  const handleSelectPost = useCallback((post: InstagramAnalyticsItem) => {
    setSelectedPost(post);
    setIsDrawerOpen(true);
  }, []);

  // Handle account selection from search
  const handleSelectAccount = useCallback((accountUsername: string) => {
    setAccount(accountUsername);
  }, []);

  // Navigate in drawer
  const handleDrawerNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedPost) return;
    const currentIndex = analytics.findIndex(p => p.id === selectedPost.id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < analytics.length) {
      setSelectedPost(analytics[newIndex]);
    }
  }, [selectedPost, analytics]);

  // Get unique accounts (filtered to allowed only)
  const accounts = useMemo(() => {
    const usernames = new Set<string>();
    analytics.forEach((p) => {
      if (p.owner_username && ALLOWED_ACCOUNTS.includes(p.owner_username)) {
        usernames.add(p.owner_username);
      }
    });
    return Array.from(usernames);
  }, [analytics]);

  // Sort accounts putting myAccount first
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a === MY_ACCOUNT_USERNAME) return -1;
      if (b === MY_ACCOUNT_USERNAME) return 1;
      return a.localeCompare(b);
    });
  }, [accounts]);

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

  // Calculate account stats for competitor comparison
  const { accountStats, accountColorMap, accountStatsMap } = useMemo(() => {
    const colorMap = new Map<string, number>();
    const statsMap = new Map<string, { postCount: number; avgEngagement: number }>();
    
    accounts.forEach((username, index) => {
      colorMap.set(username, index);
    });

    const stats: AccountStats[] = accounts.map((username, index) => {
      const accountPosts = analytics.filter((p) => p.owner_username === username);
      const totalLikes = accountPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const totalComments = accountPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
      const totalViews = accountPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const postCount = accountPosts.length;

      const avgEngagement = postCount > 0 ? Math.round((totalLikes + totalComments) / postCount) : 0;
      
      statsMap.set(username, { postCount, avgEngagement });

      return {
        username,
        postCount,
        totalLikes,
        totalComments,
        totalViews,
        avgLikes: postCount > 0 ? Math.round(totalLikes / postCount) : 0,
        avgComments: postCount > 0 ? Math.round(totalComments / postCount) : 0,
        avgEngagement,
        colorIndex: index,
      };
    });

    return { accountStats: stats, accountColorMap: colorMap, accountStatsMap: statsMap };
  }, [analytics, accounts]);

  // Build profile avatars map for AccountSelector
  const profileAvatarsMap = useMemo(() => {
    const map = new Map<string, string>();
    latestProfiles.forEach(profile => {
      if (profile.profile_pic_url) {
        map.set(profile.username, profile.profile_pic_url);
      }
    });
    return map;
  }, [latestProfiles]);

  // Filter account stats for selected competitor accounts
  const selectedAccountStats = useMemo(() => {
    return accountStats.filter((a) => selectedCompetitorAccounts.includes(a.username));
  }, [accountStats, selectedCompetitorAccounts]);

  // Get selected profile for overview
  const selectedProfile = useMemo(() => {
    if (account === "all") return latestProfiles[0] || null;
    return latestProfiles.find(p => p.username === account) || null;
  }, [account, latestProfiles]);

  // Get historical profiles for sparkline
  const historicalProfiles = useMemo(() => {
    if (!selectedProfile) return [];
    return allProfiles.filter(p => p.username === selectedProfile.username);
  }, [selectedProfile, allProfiles]);

  // Last update timestamp
  const lastUpdate = useMemo(() => {
    if (analytics.length === 0) return null;
    const dates = analytics
      .map(p => p.imported_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    return dates[0] ? new Date(dates[0]) : null;
  }, [analytics]);

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

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Data", "Username", "Tipo", "Likes", "Comentários", "Views", "Engagement", "URL"];
    const rows = filteredAnalytics.map(post => [
      post.posted_at ? format(new Date(post.posted_at), "yyyy-MM-dd HH:mm", { locale: pt }) : "",
      post.owner_username || "",
      post.post_type || "Image",
      post.likes_count || 0,
      post.comments_count || 0,
      post.views_count || 0,
      (post.likes_count || 0) + (post.comments_count || 0),
      post.post_url || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `instagram-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
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
    <div className="flex">
      {/* Sidebar navigation */}
      <AnalyticsSidebar />

      {/* Main content */}
      <div className="flex-1 container mx-auto p-4 sm:p-6 space-y-5">
        {/* 1. HEADER DO DASHBOARD */}
        <div id="dashboard-header" className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Analytics Instagram</h1>
                <p className="text-sm text-muted-foreground">
                  {isEmpty
                    ? "Importe os dados das suas publicações"
                    : `${filteredStats.totalPosts} publicações analisadas`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Smart Search */}
              {!isEmpty && (
                <SmartSearch
                  analytics={analytics}
                  accounts={sortedAccounts}
                  onSelectPost={handleSelectPost}
                  onSelectAccount={handleSelectAccount}
                />
              )}

              {/* Benchmark Link */}
              {!isEmpty && (
                <Button variant="outline" size="sm" onClick={() => navigate("/benchmark")} className="gap-2">
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">Benchmark</span>
                </Button>
              )}

              {/* Export CSV */}
              {!isEmpty && (
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </Button>
              )}
              
              {/* Last update badge */}
              {lastUpdate && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  {format(lastUpdate, "dd/MM HH:mm", { locale: pt })}
                </Badge>
              )}

              {canManageData && (
                <>
                  <DataImportHub onImport={importPosts} isImporting={isImporting} />
                  {!isEmpty && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Limpar</span>
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
                </>
              )}
            </div>
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
                {canManageData 
                  ? "Importe um ficheiro Excel ou JSON com os dados das suas publicações do Instagram."
                  : "Os dados de analytics ainda não foram carregados."}
              </p>
              {canManageData && (
                <DataImportHub onImport={importPosts} isImporting={isImporting} />
              )}
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
              accounts={sortedAccounts}
              contentTypes={contentTypes}
              onContentTypesChange={setContentTypes}
              onReset={handleResetFilters}
              totalPosts={analytics.length}
              filteredPosts={filteredAnalytics.length}
              myAccount={myAccount || undefined}
            />

            {/* Tabs: Overview + Competition + Profiles */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full sm:w-auto flex">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">Visão Geral</TabsTrigger>
                <TabsTrigger value="competition" className="gap-1.5 flex-1 sm:flex-none">
                  <Users className="h-4 w-4 hidden sm:block" />
                  Concorrência
                </TabsTrigger>
                <TabsTrigger value="profiles" className="gap-1.5 flex-1 sm:flex-none">
                  <UserCircle className="h-4 w-4 hidden sm:block" />
                  Perfis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* 2. KPI CARDS (6 cards) */}
                <KPICards stats={filteredStats} />

                {/* 3. PROFILE OVERVIEW (when single account selected) */}
                {account !== "all" && selectedProfile && (
                  <ProfileOverviewCard 
                    profile={selectedProfile} 
                    historicalProfiles={historicalProfiles}
                  />
                )}

                {/* 4. CONTENT ANALYSIS (2 columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="content-analysis">
                  <ContentTypeBreakdown data={filteredStats.contentTypeBreakdown} />
                  <HashtagCloud
                    data={filteredStats.topHashtags} 
                    contextLabel={account === "all" ? `${sortedAccounts.length} contas` : `@${account}`}
                  />
                </div>

                {/* 5. PERFORMANCE TEMPORAL (full width) */}
                <EngagementChart data={filteredStats.engagementOverTime} />

                {/* AI INSIGHTS */}
                <AIInsights analytics={filteredAnalytics} />

                {/* 6. TOP POSTS (full width - unified Top 10) */}
                <TopPostsGallery 
                  posts={filteredAnalytics} 
                  limit={10} 
                  myAccount={myAccount || undefined}
                  showUsername
                  contextLabel={account === "all" ? `${sortedAccounts.length} contas` : `@${account}`}
                />

                {/* 7. BEST TIMES TO POST (2 columns internal) */}
                <BestTimeToPost 
                  analytics={filteredAnalytics}
                  contextLabel={account === "all" ? `${sortedAccounts.length} contas` : `@${account}`}
                />

                {/* 8. CAPTION ANALYSIS */}
                <CaptionAnalysis 
                  analytics={filteredAnalytics}
                  contextLabel={account === "all" ? `${sortedAccounts.length} contas` : `@${account}`}
                />

                {/* All Posts Table */}
                <TopPostsTable posts={filteredAnalytics} accounts={sortedAccounts} />
              </TabsContent>

              <TabsContent value="competition" className="space-y-6">
                {/* Competitive Insights Summary */}
                <CompetitiveInsights
                  myAccount={myAccount || ""}
                  myStats={accountStats.find(a => a.username === myAccount) || null}
                  competitorStats={accountStats.filter(a => a.username !== myAccount && selectedCompetitorAccounts.includes(a.username))}
                />

                {/* Account Selector + Ranking */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <AccountSelector
                    accounts={accounts}
                    selectedAccounts={selectedCompetitorAccounts}
                    onSelectionChange={setSelectedCompetitorAccounts}
                    accountStats={accountStatsMap}
                    maxSelectable={10}
                    myAccount={myAccount}
                    onMyAccountChange={setMyAccount}
                    profileAvatars={profileAvatarsMap}
                  />
                  <div className="lg:col-span-2">
                    <AccountRanking accounts={selectedAccountStats} sortBy="avgEngagement" myAccount={myAccount || undefined} />
                  </div>
                </div>

                {/* Comparison Chart */}
                <AccountComparisonChart accounts={selectedAccountStats} myAccount={myAccount || undefined} analytics={analytics} />

                {/* Timeline */}
                <MultiAccountTimeline
                  analytics={analytics}
                  selectedAccounts={selectedCompetitorAccounts}
                  accountColorMap={accountColorMap}
                  myAccount={myAccount || undefined}
                />

                {/* Top Posts per Account */}
                <CompetitorTopPosts
                  analytics={analytics}
                  selectedAccounts={selectedCompetitorAccounts}
                  accountColorMap={accountColorMap}
                  postsPerAccount={6}
                  myAccount={myAccount || undefined}
                />

                {/* Posting Frequency + Engagement Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PostingFrequencyHeatmap
                    analytics={analytics}
                    selectedAccounts={selectedCompetitorAccounts}
                    accountColorMap={accountColorMap}
                    myAccount={myAccount || undefined}
                  />
                  <EngagementDistribution
                    analytics={analytics}
                    selectedAccounts={selectedCompetitorAccounts}
                    accountColorMap={accountColorMap}
                    myAccount={myAccount || undefined}
                  />
                </div>

                {/* Content Type + Hashtag Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ContentTypeComparison
                    analytics={analytics}
                    selectedAccounts={selectedCompetitorAccounts}
                    accountColorMap={accountColorMap}
                    myAccount={myAccount || undefined}
                  />
                  <HashtagComparison
                    analytics={analytics}
                    selectedAccounts={selectedCompetitorAccounts}
                    accountColorMap={accountColorMap}
                    myAccount={myAccount || undefined}
                  />
                </div>

                {/* Competitor Report Generator */}
                <CompetitorReportGenerator
                  analytics={analytics}
                  accounts={accounts}
                  accountStats={accountStats}
                  myAccount={myAccount || undefined}
                />
              </TabsContent>

              <TabsContent value="profiles" className="space-y-6">
                {/* Loading state for profiles */}
                {isLoadingProfiles ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                      ))}
                    </div>
                    <div className="grid lg:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ) : latestProfiles.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Sem dados de perfis</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        {canManageData 
                          ? "Importe um ficheiro JSON do Profile Scraper para ver os perfis."
                          : "Os dados de perfis ainda não foram carregados."}
                      </p>
                      {canManageData && (
                        <DataImportHub />
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Profile KPIs */}
                    <ProfileKPICards profiles={latestProfiles} />

                    <ProfileComparisonCards profiles={latestProfiles} mainAccount={myAccount || undefined} />

                    {/* Followers Chart */}
                    <FollowersChart profiles={latestProfiles} mainAccount={myAccount || undefined} />

                    {/* Profiles Table */}
                    <ProfilesTable profiles={latestProfiles} mainAccount={myAccount || undefined} />

                    {/* Bio Analysis */}
                    <BioAnalysis profiles={latestProfiles} mainAccount={myAccount || undefined} />

                    {/* AI Profile Report */}
                    <ProfileReportGenerator profiles={latestProfiles} mainAccount={myAccount || undefined} />
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* 9. FOOTER */}
            <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
              <p>Dados extraídos via Instagram Scraper • Plataforma de Analytics v1.0</p>
              {lastUpdate && (
                <p className="mt-1">
                  Última sincronização: {format(lastUpdate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                </p>
              )}
            </footer>
          </>
        )}
      </div>

      {/* Post Detail Drawer */}
      <PostDetailDrawer
        post={selectedPost}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
        hasPrev={selectedPost ? analytics.findIndex(p => p.id === selectedPost.id) > 0 : false}
        hasNext={selectedPost ? analytics.findIndex(p => p.id === selectedPost.id) < analytics.length - 1 : false}
        isBookmarked={selectedPost?.shortcode ? isBookmarked(selectedPost.shortcode) : false}
        onToggleBookmark={() => selectedPost?.shortcode && toggleBookmark(selectedPost.shortcode)}
      />
    </div>
  );
}
