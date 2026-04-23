import { useState } from 'react';
import { Instagram, Linkedin, Image, Calendar, Clock, Trash2, Edit, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { normalizeMediaList } from '@/lib/mediaPreview';

interface Draft {
  id: string;
  platform: string;
  caption: string | null;
  media_urls: any;
  media_items?: any;
  format?: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
}

interface DraftCardProps {
  draft: Draft;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit: (draft: Draft) => void;
  onDelete: (id: string) => void;
  view: 'list' | 'grid';
}

const platformConfig: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  'instagram_carousel': { icon: Instagram, label: 'Instagram Carrossel', color: 'bg-pink-500/10 text-pink-600' },
  'instagram-carousel': { icon: Instagram, label: 'Instagram Carrossel', color: 'bg-pink-500/10 text-pink-600' },
  'instagram_carrousel': { icon: Instagram, label: 'Instagram Carrossel', color: 'bg-pink-500/10 text-pink-600' },
  'instagram_stories': { icon: Instagram, label: 'Instagram Stories', color: 'bg-purple-500/10 text-purple-600' },
  'instagram-stories': { icon: Instagram, label: 'Instagram Stories', color: 'bg-purple-500/10 text-purple-600' },
  'instagram_reel': { icon: Instagram, label: 'Instagram Reel', color: 'bg-orange-500/10 text-orange-600' },
  'instagram-reels': { icon: Instagram, label: 'Instagram Reels', color: 'bg-orange-500/10 text-orange-600' },
  'linkedin_post': { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-500/10 text-blue-600' },
  'linkedin': { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-500/10 text-blue-600' },
  'linkedin_document': { icon: Linkedin, label: 'LinkedIn Documento', color: 'bg-sky-500/10 text-sky-600' },
  'linkedin-document': { icon: Linkedin, label: 'LinkedIn Documento', color: 'bg-sky-500/10 text-sky-600' },
};

export function DraftCard({ draft, isSelected, onSelect, onEdit, onDelete, view }: DraftCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const platformKey = draft.format || draft.platform;
  const config = platformConfig[platformKey] || { 
    icon: Image, 
    label: platformKey, 
    color: 'bg-muted text-muted-foreground' 
  };
  const Icon = config.icon;
  
  const enrichedMediaItems = normalizeMediaList(draft.media_items);
  const mediaItems = enrichedMediaItems.length > 0 ? enrichedMediaItems : normalizeMediaList(draft.media_urls);
  const mediaCount = mediaItems.length;
  const firstMedia = mediaItems[0];
  const firstMediaUrl = firstMedia?.displayUrl || null;
  const isVideo = firstMedia?.mediaType === 'video';
  
  const createdDate = format(new Date(draft.created_at), "d MMM yyyy", { locale: pt });
  const createdTime = format(new Date(draft.created_at), "HH:mm");
  
  const truncatedCaption = draft.caption 
    ? draft.caption.length > 100 
      ? `${draft.caption.substring(0, 100)}...` 
      : draft.caption
    : 'Sem legenda';

  // Grid view with large thumbnail
  if (view === 'grid') {
    return (
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}>
        <CardContent className="p-4">
          {/* Large thumbnail at top */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-3">
            {firstMediaUrl && !imageError ? (
              <>
                {isVideo ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Play className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                ) : (
                  <img 
                    src={firstMediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Media count badge */}
            {mediaCount > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Image className="h-3 w-3" />
                +{mediaCount - 1}
              </div>
            )}
            
            {/* Video indicator */}
            {isVideo && firstMediaUrl && !imageError && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Play className="h-3 w-3" />
                Vídeo
              </div>
            )}
            
            {/* Platform badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className={cn("gap-1 text-[10px]", config.color)}>
                <Icon className="h-3 w-3" />
              </Badge>
            </div>
            
            {/* Checkbox */}
            <div className="absolute top-2 right-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(draft.id, !!checked)}
                className="bg-white/80 dark:bg-black/80"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium truncate">{config.label}</span>
            {draft.scheduled_date && (
              <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0">
                <Clock className="h-2.5 w-2.5" />
                Agendado
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {truncatedCaption}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {createdDate}
            </span>
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {mediaCount}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onEdit(draft)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(draft.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view with thumbnail
  return (
    <Card className={cn(
      "group transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(draft.id, !!checked)}
          />
          
          {/* Thumbnail */}
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {firstMediaUrl && !imageError ? (
              <>
                {isVideo ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                ) : (
                  <img 
                    src={firstMediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
              </>
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center", config.color)}>
                <Icon className="h-6 w-6" />
              </div>
            )}
            
            {/* Media count badge */}
            {mediaCount > 1 && (
              <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Image className="h-2.5 w-2.5" />
                {mediaCount}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{config.label}</span>
              {draft.scheduled_date && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Agendado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {truncatedCaption}
            </p>
          </div>
          
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              {mediaCount}
            </span>
            <span className="flex items-center gap-1.5 min-w-[80px]">
              <Calendar className="h-4 w-4" />
              {createdDate}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(draft)}
            >
              <Edit className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(draft.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}