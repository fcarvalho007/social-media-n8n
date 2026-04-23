import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PostFormat } from '@/types/social';
import type { MediaSource } from '@/types/media';

interface RecoveryBannerProps {
  isRecovering: boolean;
  recoveredPostId: string | null;
  mediaFiles: File[];
  mediaPreviewUrls: string[];
  setRecoveredPostId: (id: string | null) => void;
  setMediaPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setMediaSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
  setMediaAspectRatios: React.Dispatch<React.SetStateAction<string[]>>;
  setCaption: (c: string) => void;
  setSelectedFormats: React.Dispatch<React.SetStateAction<PostFormat[]>>;
  setNetworkCaptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setUseSeparateCaptions: (b: boolean) => void;
}

/**
 * Top-of-page recovery UI: spinner during loading + thumbnail card after.
 * Phase 4 polish — extracted from ManualCreate.tsx (zero behaviour change).
 */
export function RecoveryBanner({
  isRecovering,
  recoveredPostId,
  mediaFiles,
  mediaPreviewUrls,
  setRecoveredPostId,
  setMediaPreviewUrls,
  setMediaFiles,
  setMediaSources,
  setMediaAspectRatios,
  setCaption,
  setSelectedFormats,
  setNetworkCaptions,
  setUseSeparateCaptions,
}: RecoveryBannerProps) {
  const navigate = useNavigate();

  if (isRecovering) {
    return (
      <div className="flex items-center gap-2 p-3 mx-2 sm:mx-0 rounded-lg bg-primary/10 border border-primary/20 text-primary">
        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
        <span className="text-sm">A recuperar conteúdo...</span>
      </div>
    );
  }

  if (!recoveredPostId) return null;

  const handleClear = () => {
    setRecoveredPostId(null);
    setMediaPreviewUrls([]);
    setMediaFiles([]);
    setMediaSources([]);
    setMediaAspectRatios([]);
    setCaption('');
    setSelectedFormats([]);
    setNetworkCaptions({});
    setUseSeparateCaptions(false);
    navigate('/manual-create', { replace: true });
    toast.success('Recuperação limpa');
  };

  const handleRemoveOne = (i: number) => {
    setMediaPreviewUrls((prev) => prev.filter((_, idx) => idx !== i));
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));
    setMediaSources((prev) => prev.filter((_, idx) => idx !== i));
    setMediaAspectRatios((prev) => prev.filter((_, idx) => idx !== i));
    toast.success('Imagem removida');
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 mx-2 sm:mx-0">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">Conteúdo Recuperado</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              {mediaFiles.length} ficheiro(s) carregado(s) do post anterior
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800/50 -mr-2"
          >
            Limpar
          </Button>
        </div>

        {mediaPreviewUrls.length > 0 && (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mt-3">
            {mediaPreviewUrls.slice(0, 7).map((url, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden group bg-muted">
                {mediaFiles[i]?.type.startsWith('video/') ? (
                  <video src={url} className="object-cover w-full h-full" muted />
                ) : (
                  <img src={url} alt={`Recuperado ${i + 1}`} className="object-cover w-full h-full" />
                )}
                <button
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOne(i);
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
            {mediaPreviewUrls.length > 7 && (
              <div className="aspect-square rounded-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
                +{mediaPreviewUrls.length - 7}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
