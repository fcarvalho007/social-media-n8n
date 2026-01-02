import { useState } from "react";
import { Trophy, Heart, MessageCircle, ImageOff, ExternalLink, Play, Star, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface CompetitorTopPostsProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  postsPerAccount?: number;
  myAccount?: string;
}

export function CompetitorTopPosts({
  analytics,
  selectedAccounts,
  accountColorMap,
  postsPerAccount = 3,
  myAccount,
}: CompetitorTopPostsProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Group and sort by account
  const postsByAccount = (() => {
    const grouped = new Map<string, InstagramAnalyticsItem[]>();

    analytics
      .filter((post) => post.owner_username && selectedAccounts.includes(post.owner_username))
      .forEach((post) => {
        if (!post.owner_username) return;
        const posts = grouped.get(post.owner_username) || [];
        posts.push(post);
        grouped.set(post.owner_username, posts);
      });

    // Sort each account's posts by engagement and take top N
    grouped.forEach((posts, username) => {
      posts.sort((a, b) => 
        (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count)
      );
      grouped.set(username, posts.slice(0, postsPerAccount));
    });

    return grouped;
  })();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  const handleImageError = (postId: string) => {
    setImageErrors((prev) => new Set(prev).add(postId));
  };

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Melhores Posts por Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para ver os melhores posts
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate my account from competitors and show my account first
  const orderedAccounts = myAccount && selectedAccounts.includes(myAccount)
    ? [myAccount, ...selectedAccounts.filter(a => a !== myAccount)]
    : selectedAccounts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Melhores Posts por Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {orderedAccounts.map((username) => {
          const posts = postsByAccount.get(username) || [];
          const colorIndex = accountColorMap.get(username) || 0;
          const isMyAccountSection = username === myAccount;
          const color = isMyAccountSection ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex);

          if (posts.length === 0) return null;

          return (
            <div 
              key={username} 
              className={`space-y-3 p-4 rounded-lg ${
                isMyAccountSection 
                  ? "bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700" 
                  : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className={`font-semibold ${isMyAccountSection ? "text-amber-700 dark:text-amber-300" : ""}`}>
                  @{username}
                </span>
                {isMyAccountSection ? (
                  <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 gap-1">
                    <Home className="h-3 w-3" />
                    Minha Conta
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Top {posts.length}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {posts.map((post, index) => {
                  const hasError = imageErrors.has(post.id);
                  const engagement = post.likes_count + post.comments_count;

                  return (
                    <div
                      key={post.id}
                      className={`relative group rounded-lg overflow-hidden border ${
                        isMyAccountSection ? "border-amber-200 dark:border-amber-800" : "border-border"
                      } bg-background`}
                    >
                      {/* Image */}
                      <div className="aspect-square relative">
                        {hasError || !post.thumbnail_url ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-2">
                            <ImageOff className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground capitalize">
                              {post.post_type || "Post"}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={post.thumbnail_url}
                            alt={post.caption?.slice(0, 50) || "Post"}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(post.id)}
                          />
                        )}

                        {/* Rank badge */}
                        <div className="absolute top-2 left-2">
                          <span className="text-lg">{getRankBadge(index)}</span>
                        </div>

                        {/* My account star */}
                        {isMyAccountSection && index === 0 && (
                          <div className="absolute top-2 right-10">
                            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                          </div>
                        )}

                        {/* Video indicator */}
                        {post.is_video && (
                          <div className="absolute top-2 right-2">
                            <div className="p-1 rounded-full bg-black/60">
                              <Play className="h-4 w-4 text-white fill-white" />
                            </div>
                          </div>
                        )}

                        {/* Overlay with stats */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center space-y-1">
                            <div className="flex items-center justify-center gap-3">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4 fill-white" />
                                {formatNumber(post.likes_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4 fill-white" />
                                {formatNumber(post.comments_count)}
                              </span>
                            </div>
                            {post.post_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:text-white hover:bg-white/20 mt-2"
                                onClick={() => window.open(post.post_url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Ver Post
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom stats bar */}
                      <div className="p-2 flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          {formatNumber(engagement)} eng
                        </span>
                        <span className="text-muted-foreground capitalize">
                          {post.post_type || "Image"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
