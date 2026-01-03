import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  MessageCircle,
  Eye,
  Play,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Hash,
  Calendar,
  User,
  Clock,
  Image as ImageIcon,
  Video,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface PostDetailDrawerProps {
  post: InstagramAnalyticsItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

const POST_TYPE_ICONS = {
  Video: Video,
  Sidecar: Layers,
  Image: ImageIcon,
};

const POST_TYPE_LABELS: Record<string, string> = {
  Video: "Vídeo",
  Sidecar: "Carrossel",
  Image: "Imagem",
};

export function PostDetailDrawer({
  post,
  isOpen,
  onClose,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  isBookmarked = false,
  onToggleBookmark,
}: PostDetailDrawerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!post) return null;

  const postType = post.post_type || "Image";
  const TypeIcon = POST_TYPE_ICONS[postType as keyof typeof POST_TYPE_ICONS] || ImageIcon;
  const engagement = (post.likes_count || 0) + (post.comments_count || 0);

  const handleCopyCaption = () => {
    if (post.caption) {
      navigator.clipboard.writeText(post.caption);
      toast.success("Legenda copiada!");
    }
  };

  const handleOpenInstagram = () => {
    if (post.post_url) {
      window.open(post.post_url, "_blank");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header with navigation */}
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onNavigate && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onNavigate("prev")}
                    disabled={!hasPrev}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onNavigate("next")}
                    disabled={!hasNext}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <SheetTitle className="text-base font-semibold">
                Detalhes do Post
              </SheetTitle>
            </div>

            <div className="flex items-center gap-2">
              {onToggleBookmark && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleBookmark}
                  className={isBookmarked ? "text-amber-500" : ""}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-5 w-5 fill-current" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleOpenInstagram}>
                <ExternalLink className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Image */}
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-square">
              {post.thumbnail_url ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 animate-pulse bg-muted" />
                  )}
                  <img
                    src={post.thumbnail_url}
                    alt="Post"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Type badge */}
              <Badge
                className="absolute top-3 right-3 gap-1.5"
                variant="secondary"
                style={{
                  background: postType === "Video" 
                    ? "linear-gradient(135deg, #667EEA, #764BA2)"
                    : postType === "Sidecar"
                    ? "linear-gradient(135deg, #F093FB, #F5576C)"
                    : "linear-gradient(135deg, #4FACFE, #00F2FE)",
                  color: "white",
                }}
              >
                <TypeIcon className="h-3 w-3" />
                {POST_TYPE_LABELS[postType]}
              </Badge>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                icon={Heart}
                label="Likes"
                value={post.likes_count?.toLocaleString() || "0"}
                color="text-rose-500"
              />
              <MetricCard
                icon={MessageCircle}
                label="Comentários"
                value={post.comments_count?.toLocaleString() || "0"}
                color="text-violet-500"
              />
              {post.views_count > 0 && (
                <MetricCard
                  icon={Eye}
                  label="Views"
                  value={post.views_count.toLocaleString()}
                  color="text-blue-500"
                />
              )}
              <MetricCard
                icon={Play}
                label="Engagement"
                value={engagement.toLocaleString()}
                color="text-emerald-500"
              />
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3">
              {post.owner_username && (
                <Badge variant="outline" className="gap-1.5">
                  <User className="h-3 w-3" />
                  @{post.owner_username}
                </Badge>
              )}
              {post.posted_at && (
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(post.posted_at), "d MMM yyyy", { locale: pt })}
                </Badge>
              )}
              {post.video_duration && (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3 w-3" />
                  {Math.round(post.video_duration)}s
                </Badge>
              )}
            </div>

            <Separator />

            {/* Caption */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Legenda</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCaption}
                  className="gap-1.5 h-8"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {post.caption || "Sem legenda"}
              </p>
            </div>

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">Hashtags ({post.hashtags.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleOpenInstagram}
              >
                <ExternalLink className="h-4 w-4" />
                Ver no Instagram
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopyCaption}
              >
                <Copy className="h-4 w-4" />
                Copiar Legenda
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-center">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
