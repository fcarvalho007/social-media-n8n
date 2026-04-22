import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { PostFormat, getFormatConfig } from '@/types/social';
import { MediaSource } from '@/types/media';
import {
  validateMedia,
  MediaValidationResult,
  getVideoDimensions,
  MAX_VIDEO_DURATION,
  MIN_RESOLUTIONS,
} from '@/lib/mediaValidation';
import { VideoValidationIssue } from '@/components/publishing/VideoValidationModal';
import { detectImageAspectRatio, detectVideoAspectRatio } from './mediaAspectDetection';

interface UseMediaUploadParams {
  selectedFormats: PostFormat[];
  mediaFiles: File[];
  mediaPreviewUrls: string[];
  mediaRequirements: { minMedia: number; maxMedia: number; requiresVideo: boolean; requiresImage: boolean };
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setMediaPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
  setMediaAspectRatios: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaValidations: React.Dispatch<React.SetStateAction<MediaValidationResult[]>>;
}

/**
 * useMediaUpload
 * --------------
 * Owns: upload progress, isUploading, video validation state (modal + pending
 * files + issues), handleMediaUpload, handleVideoValidationContinue,
 * handleVideoValidationCancel.
 *
 * Identical behaviour to the inline implementation in ManualCreate.tsx — Phase
 * 1 mechanical extraction.
 */
export function useMediaUpload(params: UseMediaUploadParams) {
  const {
    selectedFormats,
    mediaFiles,
    mediaPreviewUrls,
    mediaRequirements,
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaAspectRatios,
    setMediaValidations,
  } = params;

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [videoValidationModalOpen, setVideoValidationModalOpen] = useState(false);
  const [videoValidationIssues, setVideoValidationIssues] = useState<VideoValidationIssue[]>([]);
  const [pendingVideoFiles, setPendingVideoFiles] = useState<File[]>([]);

  const finalizeUpload = useCallback(
    async (filesToAdd: File[]) => {
      setIsUploading(true);
      setUploadProgress(0);

      const newUrls = filesToAdd.map((file) => URL.createObjectURL(file));

      const newAspectRatios: string[] = [];
      for (const file of filesToAdd) {
        if (file.type.startsWith('image/')) {
          newAspectRatios.push(await detectImageAspectRatio(file));
        } else if (file.type.startsWith('video/')) {
          newAspectRatios.push(await detectVideoAspectRatio(file));
        } else {
          newAspectRatios.push('auto');
        }
      }

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 50);

      const combinedFiles = [...mediaFiles, ...filesToAdd];
      const combinedUrls = [...mediaPreviewUrls, ...newUrls];

      setMediaFiles(combinedFiles);
      setMediaPreviewUrls(combinedUrls);
      setMediaSources((prev) => [
        ...prev,
        ...Array(filesToAdd.length).fill('upload' as MediaSource),
      ]);
      setMediaAspectRatios((prev) => [...prev, ...newAspectRatios]);

      return combinedFiles;
    },
    [mediaFiles, mediaPreviewUrls, setMediaAspectRatios, setMediaFiles, setMediaPreviewUrls, setMediaSources],
  );

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    const maxAllowed = mediaRequirements.maxMedia;
    const totalAfterUpload = mediaFiles.length + newFiles.length;

    const hasInstagramCarousel = selectedFormats.includes('instagram_carousel');
    if (totalAfterUpload > maxAllowed) {
      toast.error(`Máximo ${maxAllowed} ficheiros. Já tem ${mediaFiles.length}.`);
      return;
    } else if (hasInstagramCarousel && totalAfterUpload > 10) {
      toast.warning(
        `Atenção: API Instagram aceita máx. 10 imagens. A enviar ${totalAfterUpload} para Getlate.`,
        { duration: 6000 },
      );
    }

    const MAX_IMAGE_SIZE_MB = 50;
    const MAX_VIDEO_SIZE_MB = 650;
    const isLinkedInDocument = selectedFormats.includes('linkedin_document');

    for (const file of newFiles) {
      const sizeMB = file.size / (1024 * 1024);
      const isVideo = file.type.startsWith('video/');
      const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;

      if (sizeMB > maxSizeMB) {
        const fileType = isVideo ? 'Vídeo' : 'Imagem';
        toast.error(`${fileType} "${file.name}" excede ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB)`);
        return;
      }

      if (!isVideo && sizeMB > 4) {
        toast.info(
          `Imagem "${file.name}" (${sizeMB.toFixed(1)}MB) será comprimida automaticamente antes da publicação.`,
          { duration: 4000 },
        );
      }

      if (!isVideo && sizeMB > 10 && isLinkedInDocument) {
        toast.warning(
          `Imagem "${file.name}" é grande (${sizeMB.toFixed(1)}MB). A geração do PDF pode demorar.`,
          { duration: 5000 },
        );
      }
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const supportsVideo = selectedFormats.some(
      (f) =>
        f.includes('reel') ||
        f.includes('stories') ||
        f.includes('shorts') ||
        f.includes('video') ||
        f === 'instagram_image' ||
        f === 'instagram_carousel' ||
        f === 'linkedin_post' ||
        f === 'facebook_image' ||
        f === 'tiktok_video',
    );
    const hasLinkedInDocument = selectedFormats.includes('linkedin_document');
    if (supportsVideo || hasLinkedInDocument || !mediaRequirements.requiresImage) {
      validTypes.push('video/mp4', 'video/quicktime', 'video/webm');
    }
    const invalidTypes = newFiles.filter((file) => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      toast.error('Formato não suportado. Use PNG, JPG ou MP4');
      return;
    }

    const videoFiles = newFiles.filter((f) => f.type.startsWith('video/'));

    const getFormatLabel = (fmt: PostFormat): string => getFormatConfig(fmt)?.label || fmt;

    if (videoFiles.length > 0 && selectedFormats.length > 0) {
      const issues: VideoValidationIssue[] = [];

      for (const videoFile of videoFiles) {
        try {
          const videoInfo = await getVideoDimensions(videoFile);
          const videoRatio = videoInfo.width / videoInfo.height;
          const isVertical = videoRatio < 0.8;
          const isHorizontal = videoRatio > 1.2;

          for (const fmt of selectedFormats) {
            const maxDuration = MAX_VIDEO_DURATION[fmt];

            if (maxDuration && videoInfo.duration > maxDuration) {
              issues.push({
                fileName: videoFile.name,
                issue: `Duração ${Math.round(videoInfo.duration)}s excede ${maxDuration}s para ${getFormatLabel(fmt)}`,
                suggestion: `Reduza para ≤ ${maxDuration}s ou remova ${getFormatLabel(fmt)}`,
                type: 'duration',
                severity: maxDuration <= 60 ? 'error' : 'warning',
              });
            }

            if (fmt === 'youtube_video' && isVertical) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo vertical (${videoInfo.width}x${videoInfo.height}) não é adequado para YouTube Feed`,
                suggestion: 'Use YouTube Shorts para vídeos verticais 9:16',
                type: 'aspectRatio',
                severity: 'error',
              });
            }
            if (fmt === 'youtube_shorts' && isHorizontal) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo horizontal não é adequado para Shorts`,
                suggestion: 'Use YouTube Vídeo para vídeos 16:9',
                type: 'aspectRatio',
                severity: 'error',
              });
            }
            const verticalFormats = ['instagram_reel', 'tiktok_video', 'facebook_reel'];
            if (verticalFormats.includes(fmt) && isHorizontal) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo horizontal (${videoInfo.width}x${videoInfo.height}) não é ideal para ${getFormatLabel(fmt)}`,
                suggestion: 'Use um vídeo vertical 9:16 para melhores resultados',
                type: 'aspectRatio',
                severity: 'warning',
              });
            }

            const minRes = MIN_RESOLUTIONS[fmt];
            if (
              minRes &&
              (videoInfo.width < minRes.width * 0.7 || videoInfo.height < minRes.height * 0.7)
            ) {
              issues.push({
                fileName: videoFile.name,
                issue: `Resolução ${videoInfo.width}x${videoInfo.height} baixa para ${getFormatLabel(fmt)}`,
                suggestion: `Recomendado: ${minRes.width}x${minRes.height}px`,
                type: 'resolution',
                severity: 'warning',
              });
            }
          }
        } catch (err) {
          console.warn('Could not validate video:', videoFile.name, err);
        }
      }

      if (issues.length > 0) {
        setPendingVideoFiles(newFiles);
        setVideoValidationIssues(issues);
        setVideoValidationModalOpen(true);
        return;
      }
    }

    const combinedFiles = await finalizeUpload(newFiles);

    if (selectedFormats.length > 0) {
      const validations: MediaValidationResult[] = [];
      for (const file of combinedFiles) {
        const result = await validateMedia(file, selectedFormats[0]);
        validations.push(result);
      }
      setMediaValidations(validations);

      const hasWarnings = validations.some((v) => v.warnings.length > 0);
      if (hasWarnings) {
        toast.warning('Alguns ficheiros têm avisos de qualidade', { duration: 4000 });
      }
    }

    toast.success(`${newFiles.length} ficheiro(s) adicionado(s). Total: ${combinedFiles.length}`);
  };

  const handleVideoValidationContinue = async () => {
    setVideoValidationModalOpen(false);
    const filesToAdd = pendingVideoFiles;
    setPendingVideoFiles([]);
    setVideoValidationIssues([]);

    const combinedFiles = await finalizeUpload(filesToAdd);

    toast.success(
      `${filesToAdd.length} ficheiro(s) adicionado(s) com avisos. Total: ${combinedFiles.length}`,
    );
  };

  const handleVideoValidationCancel = () => {
    setVideoValidationModalOpen(false);
    setPendingVideoFiles([]);
    setVideoValidationIssues([]);
    toast.info('Upload cancelado');
  };

  return {
    uploadProgress,
    isUploading,
    setUploadProgress,
    setIsUploading,
    videoValidationModalOpen,
    videoValidationIssues,
    pendingVideoFiles,
    setVideoValidationModalOpen,
    handleMediaUpload,
    handleVideoValidationContinue,
    handleVideoValidationCancel,
  };
}
