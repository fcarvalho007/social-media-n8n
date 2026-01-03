import { useState, useMemo, useCallback, memo } from "react";
import { ExternalLink, Heart, MessageCircle, Eye, ImageOff, Play, Star, ArrowUpDown, Images } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface TopPostsGalleryProps {
  posts: InstagramAnalyticsItem[];
  limit?: number;
  myAccount?: string;
  showUsername?: boolean;
  contextLabel?: string;
  sortBy?: "engagement" | "likes" | "comments" | "views";
  onSortChange?: (sortBy: "engagement" | "likes" | "comments" | "views") => void;
}

const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
};

const RANKING_STYLES = [
  { badge: "🥇", ring: "ring-2 ring-yellow-500/60", glow: "shadow-yellow-500/30 shadow-lg" },
  { badge: "🥈", ring: "ring-2 ring-gray-400/60", glow: "shadow-gray-400/20 shadow-md" },
  { badge: "🥉", ring: "ring-2 ring-orange-500/60", glow: "shadow-orange-500/20 shadow-md" },
  { badge: "4", ring: "", glow: "" },
  { badge: "5", ring: "", glow: "" },
  { badge: "6", ring: "", glow: "" },
  { badge: "7", ring: "", glow: "" },
  { badge: "8", ring: "", glow: "" },
  { badge: "9", ring: "", glow: "" },
  { badge: "10", ring: "", glow: "" },
];

const SORT_OPTIONS = [
  { value: "engagement", label: "Engagement" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comentários" },
  { value: "views", label: "Views" },
] as const;

export const TopPostsGallery = memo(function TopPostsGallery({ 
  posts, 
  limit = 10, 
  myAccount, 
  showUsername = false, 
  contextLabel,
  sortBy: externalSortBy,
  onSortChange 
}: TopPostsGalleryProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [internalSortBy, setInternalSortBy] = useState<"engagement" | "likes" | "comments" | "views">("engagement");
  
  const sortBy = externalSortBy || internalSortBy;
  
  const handleSortChange = useCallback((newSortBy: "engagement" | "likes" | "comments" | "views") => {
    setInternalSortBy(newSortBy);
    onSortChange?.(newSortBy);
  }, [onSortChange]);

  const sortedPosts = useMemo(() => [...posts]
    .sort((a, b) => {
      switch (sortBy) {
        case "likes":
          return (b.likes_count || 0) - (a.likes_count || 0);
        case "comments":
          return (b.comments_count || 0) - (a.comments_count || 0);
        case "views":
          return (b.views_count || 0) - (a.views_count || 0);
        case "engagement":
        default:
          return (
            (b.likes_count || 0) + (b.comments_count || 0) -
            ((a.likes_count || 0) + (a.comments_count || 0))
          );
      }
    })
    .slice(0, limit), [posts, sortBy, limit]);

  const isMyAccountPost = useCallback((post: InstagramAnalyticsItem) => myAccount && post.owner_username === myAccount, [myAccount]);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const handleImageError = useCallback((id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  }, []);

  if (sortedPosts.length === 0) return null;

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Engagement";

  return (
    <Card id="top-posts" className="overflow-hidden" role="region" aria-label="Top posts por engagement">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-lg font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10" aria-hidden="true">
            <Images className="h-5 w-5 text-primary" />
          </div>
          Top {Math.min(limit, sortedPosts.length)} Posts
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 text-xs rounded-lg border-border/60 hover:bg-muted"
                aria-label={`Ordenar por ${currentSortLabel}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                {currentSortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`rounded-lg ${sortBy === option.value ? "bg-primary/10 text-primary" : ""}`}
                  aria-selected={sortBy === option.value}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {contextLabel && (
            <Badge variant="outline" className="text-xs font-normal rounded-full" role="status">
              {contextLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4" role="list" aria-label="Lista de posts ordenados por engagement">
          {sortedPosts.map((post, index) => {
            const style = RANKING_STYLES[index] || RANKING_STYLES[5];
            const engagement = (post.likes_count || 0) + (post.comments_count || 0);
            const hasError = imageErrors.has(post.id);
            const isVideo = post.is_video || post.post_type === "Video";
            const isSidecar = post.post_type === "Sidecar";
            const isMyPost = isMyAccountPost(post);
              
            return (
              <a
                key={post.id}
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                role="listitem"
                aria-label={`Post #${index + 1} de @${post.owner_username || 'desconhecido'} com ${formatNumber(engagement)} interações. Abrir no Instagram.`}
                className={`group relative rounded-xl overflow-hidden bg-muted transition-all duration-300 hover:scale-[1.03] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${style.ring} ${style.glow} ${isMyPost ? 'ring-2 ring-amber-500/60' : ''}`}
                style={isMyPost ? { boxShadow: `0 0 20px ${MY_ACCOUNT_COLOR}50` } : undefined}
              >
                {/* My Account Badge */}
                {isMyPost && (
                  <div className="absolute top-2 right-9 z-20" aria-label="Seu post">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500 drop-shadow-lg" aria-hidden="true" />
                  </div>
                )}

                {/* Ranking Badge */}
                <div className="absolute top-2 left-2 z-20" aria-hidden="true">
                  {index < 3 ? (
                    <span className="text-xl drop-shadow-lg">{style.badge}</span>
                  ) : (
                    <Badge className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0 rounded-full">
                      #{index + 1}
                    </Badge>
                  )}
                </div>

                {/* Type Badge - Video or Carousel indicator */}
                <div className="absolute top-2 right-2 z-20" aria-hidden="true">
                  {isVideo && (
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-1.5 shadow-lg">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                  {isSidecar && !isVideo && (
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1.5 shadow-lg">
                      <Images className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="aspect-square relative">
                  {/* Image with LazyImage */}
                  {post.thumbnail_url && !hasError ? (
                    <LazyImage
                      src={post.thumbnail_url}
                      alt={`Thumbnail do post de @${post.owner_username || 'desconhecido'}`}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      onError={() => handleImageError(post.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                      <ImageOff className="h-10 w-10 mb-2 opacity-50" aria-hidden="true" />
                      <span className="text-xs font-medium">
                        {TYPE_LABELS[post.post_type || "Image"] || "Post"}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay with gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                    <p className="text-white text-xs line-clamp-3 leading-relaxed">
                      {post.caption?.substring(0, 80) || "Sem legenda"}
                    </p>
                  </div>

                  {/* External link icon */}
                  <ExternalLink className="absolute top-2 right-2 h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg z-10" aria-hidden="true" />
                </div>

                {/* Metrics - Premium card footer */}
                <div className="p-3 space-y-2 bg-card border-t border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-xs">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      <span className="font-semibold">{formatNumber(post.likes_count || 0)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold">{formatNumber(post.comments_count || 0)}</span>
                    </div>
                    {post.views_count > 0 && (
                      <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{formatNumber(post.views_count)}</span>
                      </div>
                    )}
                  </div>

                  {/* Username badge */}
                  {(showUsername || myAccount) && post.owner_username && (
                    <div className={`flex items-center gap-1 text-[10px] truncate ${isMyPost ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                      {isMyPost && <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500 flex-shrink-0" />}
                      <span className="truncate">@{post.owner_username}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className="text-[9px] px-1.5 py-0 h-4 rounded-full bg-muted/80"
                    >
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
});
