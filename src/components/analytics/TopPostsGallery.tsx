import { ExternalLink, Heart, MessageCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface TopPostsGalleryProps {
  posts: InstagramAnalyticsItem[];
  limit?: number;
}

const RANKING_STYLES = [
  { badge: "🥇", bg: "bg-yellow-500/20", border: "border-yellow-500/50" },
  { badge: "🥈", bg: "bg-gray-300/20", border: "border-gray-400/50" },
  { badge: "🥉", bg: "bg-orange-400/20", border: "border-orange-400/50" },
];

export function TopPostsGallery({ posts, limit = 3 }: TopPostsGalleryProps) {
  const sortedPosts = [...posts]
    .sort(
      (a, b) =>
        (b.likes_count || 0) +
        (b.comments_count || 0) -
        ((a.likes_count || 0) + (a.comments_count || 0))
    )
    .slice(0, limit);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (sortedPosts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏆 Top Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sortedPosts.map((post, index) => {
            const style = RANKING_STYLES[index] || RANKING_STYLES[2];
            const engagement =
              (post.likes_count || 0) + (post.comments_count || 0);

            return (
              <a
                key={post.id}
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-xl overflow-hidden border-2 ${style.border} ${style.bg} transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                {/* Ranking Badge */}
                <div className="absolute top-2 left-2 z-10 text-2xl">
                  {style.badge}
                </div>

                {/* Thumbnail */}
                <div className="aspect-square bg-muted">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sem imagem
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* External link icon */}
                  <ExternalLink className="absolute top-2 right-2 h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Metrics */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-sm">
                      <Heart className="h-3.5 w-3.5 text-red-500" />
                      <span className="font-medium">
                        {formatNumber(post.likes_count || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">
                        {formatNumber(post.comments_count || 0)}
                      </span>
                    </div>
                    {post.views_count > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-3.5 w-3.5 text-purple-500" />
                        <span className="font-medium">
                          {formatNumber(post.views_count)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-background/50"
                    >
                      {post.post_type === "Sidecar"
                        ? "Carrossel"
                        : post.post_type === "Video"
                        ? "Vídeo"
                        : "Imagem"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatNumber(engagement)} eng.
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
