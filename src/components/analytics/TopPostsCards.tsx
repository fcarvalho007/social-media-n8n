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
const RANK_COLORS = [
  "text-yellow-500 bg-yellow-500/15",
  "text-slate-400 bg-slate-400/15",
  "text-amber-600 bg-amber-600/15"
];
const RANK_GLOWS = [
  "shadow-[0_0_12px_rgba(234,179,8,0.4)]",
  "shadow-[0_0_8px_rgba(148,163,184,0.3)]",
  "shadow-[0_0_8px_rgba(217,119,6,0.3)]"
];

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/15">
            <Crown className="h-4 w-4 text-yellow-500" />
          </div>
          Top {limit} Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPosts.map((post, index) => {
            const RankIcon = RANK_ICONS[index] || Medal;
            const rankColor = RANK_COLORS[index] || "text-muted-foreground bg-muted";
            const rankGlow = RANK_GLOWS[index] || "";
            const isMyPost = post.owner_username === myAccount;
            const engagement = post.likes_count + post.comments_count;

            return (
              <div
                key={post.id}
                className="relative group rounded-xl border bg-card overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.caption?.slice(0, 50) || "Post"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Rank badge with glow */}
                  <div className={`absolute top-2 left-2 p-2 rounded-full ${rankColor} ${rankGlow} transition-shadow`}>
                    <RankIcon className="h-4 w-4" />
                  </div>

                  {/* Type badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-[10px] bg-background/90 backdrop-blur-sm"
                  >
                    {TYPE_LABELS[post.post_type || "Image"] || post.post_type}
                  </Badge>

                  {/* Overlay with link */}
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                      <ExternalLink className="h-5 w-5 text-white" />
                    </div>
                  </a>
                </div>

                {/* Stats */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 group/stat">
                        <Heart className="h-3.5 w-3.5 text-rose-500 group-hover/stat:scale-110 transition-transform" />
                        <span className="font-medium">{formatNumber(post.likes_count)}</span>
                      </span>
                      <span className="flex items-center gap-1 group/stat">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500 group-hover/stat:scale-110 transition-transform" />
                        <span className="font-medium">{formatNumber(post.comments_count)}</span>
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {formatNumber(engagement)} eng
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={isMyPost ? "text-yellow-600 font-medium" : ""}>
                      @{post.owner_username}
                    </span>
                    {post.posted_at && (
                      <span className="text-muted-foreground/70">
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