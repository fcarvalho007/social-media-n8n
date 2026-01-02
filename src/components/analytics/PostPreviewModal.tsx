import { X, Heart, MessageCircle, Eye, Calendar, Copy, ExternalLink, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface PostPreviewModalProps {
  post: InstagramAnalyticsItem | null;
  isOpen: boolean;
  onClose: () => void;
  accountColor?: string;
  isMyAccount?: boolean;
}

export function PostPreviewModal({ 
  post, 
  isOpen, 
  onClose,
  accountColor,
  isMyAccount
}: PostPreviewModalProps) {
  if (!post) return null;

  const formatNumber = (num: number | null) => {
    if (num === null) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Data desconhecida";
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleCopyCaption = () => {
    if (post.caption) {
      navigator.clipboard.writeText(post.caption);
      toast.success("Caption copiada para o clipboard");
    }
  };

  const handleOpenInstagram = () => {
    if (post.post_url) {
      window.open(post.post_url, "_blank", "noopener,noreferrer");
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case "image": return "Imagem";
      case "video": return "Vídeo";
      case "sidecar": return "Carrossel";
      default: return type || "Post";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {accountColor && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: accountColor }} 
                />
              )}
              <DialogTitle className={`text-base font-semibold ${isMyAccount ? "text-amber-600 dark:text-amber-400" : ""}`}>
                @{post.owner_username}
                {isMyAccount && " ⭐"}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 p-4 pt-2">
          {/* Image */}
          <div className="flex-shrink-0 w-full md:w-1/2">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              {post.thumbnail_url ? (
                <img
                  src={post.thumbnail_url}
                  alt={post.caption?.slice(0, 50) || "Post"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center");
                    const fallback = document.createElement("div");
                    fallback.className = "flex flex-col items-center gap-2 text-muted-foreground";
                    fallback.innerHTML = `<svg class="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span class="text-sm">Imagem não disponível</span>`;
                    e.currentTarget.parentElement?.appendChild(fallback);
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageOff className="h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Imagem não disponível</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <Heart className="h-4 w-4 text-red-500 mb-1" />
                <span className="text-lg font-bold">{formatNumber(post.likes_count)}</span>
                <span className="text-xs text-muted-foreground">Likes</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <MessageCircle className="h-4 w-4 text-blue-500 mb-1" />
                <span className="text-lg font-bold">{formatNumber(post.comments_count)}</span>
                <span className="text-xs text-muted-foreground">Comentários</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <Eye className="h-4 w-4 text-green-500 mb-1" />
                <span className="text-lg font-bold">{formatNumber(post.views_count)}</span>
                <span className="text-xs text-muted-foreground">Views</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{getTypeLabel(post.post_type)}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(post.posted_at)}
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <ScrollArea className="flex-1 max-h-[150px] rounded-lg border p-3">
                <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
              </ScrollArea>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
              {post.caption && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleCopyCaption}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Caption
                </Button>
              )}
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleOpenInstagram}
                disabled={!post.post_url}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Instagram
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
