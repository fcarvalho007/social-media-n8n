import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Crown, Trophy, Medal, ExternalLink } from "lucide-react";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface TopPostsCardsProps {
  posts: InstagramAnalyticsItem[];
  limit?: number;
  myAccount?: string;
}

const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
  Reel: "Reel",
};

const RANK_ICONS = [Crown, Trophy, Medal];
const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-600"];

export function TopPostsCards({ posts, limit = 3, myAccount }: TopPostsCardsProps) {
  const topPosts = [...posts]
    .sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count))
    .slice(0, limit);

  if (topPosts.length === 0) {
    return null;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Top {limit} Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPosts.map((post, index) => {
            const RankIcon = RANK_ICONS[index] || Medal;
            const rankColor = RANK_COLORS[index] || "text-muted-foreground";
            const isMyPost = post.owner_username === myAccount;
            const engagement = post.likes_count + post.comments_count;

            return (
              <div
                key={post.id}
                className="relative group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-muted">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.caption?.slice(0, 50) || "Post"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                  
                  {/* Rank badge */}
                  <div className={`absolute top-2 left-2 p-1.5 rounded-full bg-background/90 ${rankColor}`}>
                    <RankIcon className="h-4 w-4" />
                  </div>

                  {/* Type badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-[10px] bg-background/90"
                  >
                    {TYPE_LABELS[post.post_type || "Image"] || post.post_type}
                  </Badge>

                  {/* Overlay with link */}
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="h-6 w-6 text-white" />
                  </a>
                </div>

                {/* Stats */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-red-500" />
                        {formatNumber(post.likes_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                        {formatNumber(post.comments_count)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {formatNumber(engagement)} eng
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={isMyPost ? "text-yellow-600 font-medium" : ""}>
                      @{post.owner_username}
                    </span>
                    {post.posted_at && (
                      <span>
                        {format(new Date(post.posted_at), "d MMM", { locale: pt })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
