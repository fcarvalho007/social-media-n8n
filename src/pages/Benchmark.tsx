import { useState, useMemo } from "react";
import { BarChart3, Users, Trophy, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInstagramAnalytics } from "@/hooks/useInstagramAnalytics";
import { useInstagramProfiles } from "@/hooks/useInstagramProfiles";
import { ComparisonRadarChart } from "@/components/benchmark/ComparisonRadarChart";
import { BenchmarkRankingTable } from "@/components/benchmark/BenchmarkRankingTable";
import { BenchmarkMetricCards } from "@/components/benchmark/BenchmarkMetricCards";

export default function Benchmark() {
  const navigate = useNavigate();
  const { analytics, isLoading } = useInstagramAnalytics({ publicMode: true });
  const { latestProfiles } = useInstagramProfiles({ publicMode: true });
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Get unique accounts
  const accounts = useMemo(() => {
    const usernames = new Set<string>();
    analytics.forEach((p) => {
      if (p.owner_username) usernames.add(p.owner_username);
    });
    return Array.from(usernames).sort();
  }, [analytics]);

  // Calculate stats for each account
  const accountStats = useMemo(() => {
    return accounts.map((username) => {
      const posts = analytics.filter((p) => p.owner_username === username);
      const profile = latestProfiles.find((p) => p.username === username);

      const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
      const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const postCount = posts.length;

      // Content type breakdown
      const videoCount = posts.filter((p) => p.post_type === "Video").length;
      const carouselCount = posts.filter((p) => p.post_type === "Sidecar").length;
      const imageCount = posts.filter((p) => p.post_type === "Image").length;

      // Calculate posting frequency (posts per week)
      const dates = posts.map((p) => p.posted_at).filter(Boolean).map((d) => new Date(d!));
      let postsPerWeek = 0;
      if (dates.length >= 2) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        const weeks = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        postsPerWeek = postCount / weeks;
      }

      // Top hashtags
      const hashtagMap = new Map<string, number>();
      posts.forEach((p) => {
        (p.hashtags || []).forEach((tag) => {
          hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
        });
      });
      const topHashtags = Array.from(hashtagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      return {
        username,
        profile,
        postCount,
        totalLikes,
        totalComments,
        totalViews,
        avgEngagement: postCount > 0 ? Math.round((totalLikes + totalComments) / postCount) : 0,
        avgLikes: postCount > 0 ? Math.round(totalLikes / postCount) : 0,
        engagementRate: profile?.followers_count
          ? ((totalLikes + totalComments) / postCount / profile.followers_count) * 100
          : 0,
        videoPercent: postCount > 0 ? (videoCount / postCount) * 100 : 0,
        carouselPercent: postCount > 0 ? (carouselCount / postCount) * 100 : 0,
        imagePercent: postCount > 0 ? (imageCount / postCount) * 100 : 0,
        postsPerWeek,
        topHashtags,
        followers: profile?.followers_count || 0,
      };
    });
  }, [accounts, analytics, latestProfiles]);

  // Selected account stats
  const selectedStats = useMemo(() => {
    return accountStats.filter((s) => selectedAccounts.includes(s.username));
  }, [accountStats, selectedAccounts]);

  const toggleAccount = (username: string) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(username)) {
        return prev.filter((a) => a !== username);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, username];
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/analytics")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Benchmark de Contas</h1>
            <p className="text-sm text-muted-foreground">
              Compare até 5 contas lado a lado
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Account selector */}
        <Card className="card-premium">
          <CardHeader className="card-premium-header">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Selecionar Contas
              <Badge variant="secondary" className="ml-auto">
                {selectedAccounts.length}/5
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {accountStats.map((stat) => (
                  <div
                    key={stat.username}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedAccounts.includes(stat.username)
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => toggleAccount(stat.username)}
                  >
                    <Checkbox
                      checked={selectedAccounts.includes(stat.username)}
                      disabled={!selectedAccounts.includes(stat.username) && selectedAccounts.length >= 5}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {stat.profile?.profile_pic_url ? (
                        <img
                          src={stat.profile.profile_pic_url}
                          alt={stat.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">@{stat.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.postCount} posts · {stat.followers.toLocaleString()} seguidores
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Comparison area */}
        <div className="space-y-6">
          {selectedStats.length < 2 ? (
            <Card className="card-premium">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione pelo menos 2 contas</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Escolha entre 2 e 5 contas na lista ao lado para visualizar a comparação
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Metric comparison cards */}
              <BenchmarkMetricCards stats={selectedStats} />

              {/* Radar chart */}
              <ComparisonRadarChart stats={selectedStats} />

              {/* Ranking table */}
              <BenchmarkRankingTable stats={selectedStats} allStats={accountStats} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
