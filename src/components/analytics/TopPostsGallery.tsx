import { useState } from "react";
import { ExternalLink, Heart, MessageCircle, Eye, ImageOff, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface TopPostsGalleryProps {
  posts: InstagramAnalyticsItem[];
  limit?: number;
}

const RANKING_STYLES = [
  { badge: "🥇", ring: "ring-2 ring-yellow-500/50", glow: "shadow-yellow-500/20" },
  { badge: "🥈", ring: "ring-2 ring-gray-400/50", glow: "shadow-gray-400/20" },
  { badge: "🥉", ring: "ring-2 ring-orange-500/50", glow: "shadow-orange-500/20" },
  { badge: "4", ring: "", glow: "" },
  { badge: "5", ring: "", glow: "" },
  { badge: "6", ring: "", glow: "" },
];

const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
};

export function TopPostsGallery({ posts, limit = 6 }: TopPostsGalleryProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set(posts.map(p => p.id)));

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

  const handleImageLoad = (id: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (sortedPosts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏆 Top {Math.min(limit, sortedPosts.length)} Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sortedPosts.map((post, index) => {
            const style = RANKING_STYLES[index] || RANKING_STYLES[5];
            const engagement = (post.likes_count || 0) + (post.comments_count || 0);
            const hasError = imageErrors.has(post.id);
            const isLoading = loadingImages.has(post.id);
            const isVideo = post.is_video || post.post_type === "Video";

            return (
              <a
                key={post.id}
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-xl overflow-hidden bg-muted transition-all hover:scale-[1.02] hover:shadow-lg ${style.ring} ${style.glow}`}
              >
                {/* Ranking Badge */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  {index < 3 ? (
                    <span className="text-lg">{style.badge}</span>
                  ) : (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      #{index + 1}
                    </Badge>
                  )}
                </div>

                {/* Video indicator */}
                {isVideo && (
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <div className="bg-black/60 rounded-full p-1">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                  </div>
                )}

                {/* Thumbnail */}
                <div className="aspect-square relative">
                  {/* Loading state */}
                  {isLoading && !hasError && (
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  )}

                  {/* Image */}
                  {post.thumbnail_url && !hasError ? (
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className={`w-full h-full object-cover transition-opacity ${
                        isLoading ? "opacity-0" : "opacity-100"
                      }`}
                      onLoad={() => handleImageLoad(post.id)}
                      onError={() => handleImageError(post.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted">
                      <ImageOff className="h-8 w-8 mb-1" />
                      <span className="text-xs">
                        {TYPE_LABELS[post.post_type || "Image"] || "Post"}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="text-white text-xs line-clamp-2">
                      {post.caption?.substring(0, 60) || "Sem legenda"}
                    </div>
                  </div>

                  {/* External link icon */}
                  <ExternalLink className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>

                {/* Metrics */}
                <div className="p-2 space-y-1.5 bg-card">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 text-xs">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium">{formatNumber(post.likes_count || 0)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs">
                      <MessageCircle className="h-3 w-3 text-primary" />
                      <span className="font-medium">{formatNumber(post.comments_count || 0)}</span>
                    </div>
                    {post.views_count > 0 && (
                      <div className="flex items-center gap-0.5 text-xs">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span>{formatNumber(post.views_count)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {TYPE_LABELS[post.post_type || "Image"] || post.post_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatNumber(engagement)} eng
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
