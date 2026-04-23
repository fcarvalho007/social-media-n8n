import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileImage, ImagePlus, FileText, Calendar, Play, FileVideo, Files } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MediaPreviewType } from '@/lib/mediaPreview';

interface PendingThumbnailProps {
  id: string;
  type: 'story' | 'carousel' | 'post' | 'draft' | 'scheduled';
  thumbnail: string | null;
  mediaType: MediaPreviewType;
  mediaCount: number;
  caption: string | null;
  createdAt: string;
  scheduledDate?: string | null;
  route: string;
  onNavigate: (route: string) => void;
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'story': return 'Story';
    case 'carousel': return 'Carrossel';
    case 'post': return 'Post';
    case 'draft': return 'Rascunho';
    case 'scheduled': return 'Agendado';
    default: return type;
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'draft': return 'bg-warning-light text-warning border-warning/30';
    case 'scheduled': return 'bg-primary-light text-primary border-primary/30';
    default: return 'bg-accent/10 text-accent border-accent/30';
  }
};

const getFallbackIcon = (type: string, mediaType: MediaPreviewType) => {
  if (mediaType === 'video') return FileVideo;
  if (mediaType === 'document') return FileText;
  if (type === 'story') return FileImage;
  if (type === 'carousel') return ImagePlus;
  if (type === 'scheduled') return Calendar;
  return FileText;
};

const getDateLabel = (type: string, createdAt: string, scheduledDate?: string | null) => {
  const date = type === 'scheduled' && scheduledDate ? new Date(scheduledDate) : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return type === 'draft' ? 'Guardado' : 'Criado';

  const prefix = type === 'scheduled' ? 'Agendado' : type === 'draft' ? 'Guardado' : 'Criado';
  const pattern = type === 'scheduled' ? "d MMM, HH:mm" : 'd MMM';
  return `${prefix} ${format(date, pattern, { locale: pt })}`;
};

export function PendingThumbnail({
  id,
  type,
  thumbnail,
  mediaType,
  mediaCount,
  caption,
  createdAt,
  scheduledDate,
  route,
  onNavigate,
}: PendingThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const showVisualMedia = thumbnail && !imgError && mediaType !== 'document';
  const FallbackIcon = getFallbackIcon(type, mediaType);
  const dateLabel = getDateLabel(type, createdAt, scheduledDate);
  const captionPreview = caption?.trim() || 'Sem legenda';

  return (
    <div
      onClick={() => onNavigate(route)}
      className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onNavigate(route);
      }}
      aria-label={`Abrir ${getTypeLabel(type)} ${id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {showVisualMedia ? (
          mediaType === 'video' ? (
            <video
              src={thumbnail}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              preload="metadata"
              muted
              playsInline
              onError={() => setImgError(true)}
            />
          ) : (
            <img
              src={thumbnail}
              alt="Pré-visualização do conteúdo"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <FallbackIcon className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}

        <Badge className={`absolute left-1.5 top-1.5 h-5 border px-1.5 py-0 text-[10px] ${getTypeBadgeColor(type)}`}>
          {getTypeLabel(type)}
        </Badge>

        {mediaType === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm">
              <Play className="h-4 w-4 fill-current" />
            </div>
          </div>
        )}

        {mediaCount > 1 && (
          <Badge variant="secondary" className="absolute bottom-1.5 right-1.5 h-5 gap-1 px-1.5 py-0 text-[10px]">
            <Files className="h-3 w-3" />
            {mediaCount}
          </Badge>
        )}
      </div>

      <div className="space-y-1 border-t border-border/60 p-2">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{dateLabel}</p>
        <p className="line-clamp-2 min-h-[2rem] text-xs leading-4 text-foreground">{captionPreview}</p>
      </div>
    </div>
  );
}
