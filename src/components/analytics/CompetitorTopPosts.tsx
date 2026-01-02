import { useState } from "react";
import { Trophy, Heart, MessageCircle, ImageOff, ExternalLink, Play, Star, Home, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";
import { PostPreviewModal } from "./PostPreviewModal";
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
  const [previewPost, setPreviewPost] = useState<InstagramAnalyticsItem | null>(null);

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

  // Get color for preview modal
  const getPostColor = (post: InstagramAnalyticsItem) => {
    if (!post.owner_username) return undefined;
    if (post.owner_username === myAccount) return MY_ACCOUNT_COLOR;
    const colorIndex = accountColorMap.get(post.owner_username) || 0;
    return getAccountColor(colorIndex);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Melhores Posts por Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderedAccounts.map((username) => {
            const posts = postsByAccount.get(username) || [];
            const colorIndex = accountColorMap.get(username) || 0;
            const isMyAccountSection = username === myAccount;
            const color = isMyAccountSection ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex);

            if (posts.length === 0) return null;

            return (
              <div 
                key={username} 
                className={`space-y-3 p-3 rounded-lg ${
                  isMyAccountSection 
                    ? "bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700" 
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`font-semibold text-sm ${isMyAccountSection ? "text-amber-700 dark:text-amber-300" : ""}`}>
                    @{username}
                  </span>
                  {isMyAccountSection ? (
                    <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 gap-1 text-xs">
                      <Home className="h-3 w-3" />
                      Você
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Top {posts.length}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {posts.map((post, index) => {
                    const hasError = imageErrors.has(post.id);
                    const engagement = post.likes_count + post.comments_count;

                    return (
                      <div
                        key={post.id}
                        className={`relative group rounded-lg overflow-hidden border cursor-pointer ${
                          isMyAccountSection ? "border-amber-200 dark:border-amber-800" : "border-border"
                        } bg-background hover:ring-2 hover:ring-primary/50 transition-all`}
                        onClick={() => setPreviewPost(post)}
                      >
                        {/* Image */}
                        <div className="aspect-square relative">
                          {hasError || !post.thumbnail_url ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-1">
                              <ImageOff className="h-6 w-6 text-muted-foreground" />
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
                          <div className="absolute top-1.5 left-1.5">
                            <span className="text-base">{getRankBadge(index)}</span>
                          </div>

                          {/* Video indicator */}
                          {post.is_video && (
                            <div className="absolute top-1.5 right-1.5">
                              <div className="p-1 rounded-full bg-black/60">
                                <Play className="h-3 w-3 text-white fill-white" />
                              </div>
                            </div>
                          )}

                          {/* Preview hint on hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center">
                              <Eye className="h-5 w-5 mx-auto mb-1" />
                              <span className="text-xs">Ver detalhes</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom stats bar */}
                        <div className="p-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Heart className="h-3 w-3 text-red-500" />
                              {formatNumber(post.likes_count)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="h-3 w-3 text-blue-500" />
                              {formatNumber(post.comments_count)}
                            </span>
                          </div>
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

      <PostPreviewModal
        post={previewPost}
        isOpen={!!previewPost}
        onClose={() => setPreviewPost(null)}
        accountColor={previewPost ? getPostColor(previewPost) : undefined}
        isMyAccount={previewPost?.owner_username === myAccount}
      />
    </>
  );
}

