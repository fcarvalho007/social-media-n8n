import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat } from '@/types/social';
import { MediaSource } from '@/types/media';
import { detectImageAspectRatio, detectVideoAspectRatio } from './mediaAspectDetection';

interface UseDraftRecoveryParams {
  recoverPostId: string | null;
  setCaption: (next: string) => void;
  setUseSeparateCaptions: (next: boolean) => void;
  setNetworkCaptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMediaPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setMediaAspectRatios: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFormats: React.Dispatch<React.SetStateAction<PostFormat[]>>;
  setScheduleAsap: (next: boolean) => void;
  setScheduledDate: (d: Date | undefined) => void;
  setTime: (t: string) => void;
  setVisitedSteps: React.Dispatch<React.SetStateAction<number[]>>;
  setCurrentStep: (n: number) => void;
}

/**
 * useDraftRecovery
 * ----------------
 * Owns: recovery flag, recoveredPostId, currentDraftId, fetchImageAsFile,
 * loadPostForRecovery, handleLoadDraft. Also wires the two effects that
 * trigger recovery on mount (?recover=) and from sessionStorage editDraft.
 *
 * Behaviour is identical to the inline version in ManualCreate.tsx — only
 * the location changes (Phase 1 mechanical extraction).
 */
export function useDraftRecovery(params: UseDraftRecoveryParams) {
  const {
    recoverPostId,
    setCaption,
    setUseSeparateCaptions,
    setNetworkCaptions,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaFiles,
    setMediaAspectRatios,
    setSelectedFormats,
    setScheduleAsap,
    setScheduledDate,
    setTime,
    setVisitedSteps,
    setCurrentStep,
  } = params;

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveredPostId, setRecoveredPostId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const fetchImageAsFile = useCallback(async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      const fileName = url.split('/').pop() || `image-${Date.now()}.jpg`;
      return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    } catch (error) {
      console.error('Error fetching image as file:', error);
      return null;
    }
  }, []);

  const loadPostForRecovery = useCallback(
    async (postId: string) => {
      setIsRecovering(true);
      try {
        const { data: post, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (error) throw error;
        if (!post) {
          toast.error('Post não encontrado');
          setIsRecovering(false);
          return;
        }

        setCaption(post.caption_edited || post.caption || '');

        if (post.linkedin_body) {
          setUseSeparateCaptions(true);
          setNetworkCaptions((prev) => ({
            ...prev,
            linkedin: post.linkedin_body || '',
          }));
        }

        const hashtagsEdited = (post.hashtags_edited as string[]) || [];
        const hashtagsText = post.hashtags_text || '';

        if (hashtagsText && !post.caption?.includes(hashtagsText)) {
          const fullCaption = (post.caption_edited || post.caption || '') + '\n\n' + hashtagsText;
          setCaption(fullCaption);
        } else if (hashtagsEdited.length > 0 && !post.caption?.includes('#')) {
          const hashtagString = hashtagsEdited
            .map((h) => (h.startsWith('#') ? h : `#${h}`))
            .join(' ');
          const fullCaption = (post.caption_edited || post.caption || '') + '\n\n' + hashtagString;
          setCaption(fullCaption);
        }

        const imageUrls = post.template_a_images || [];
        const mediaItems = (post.media_items as any[]) || [];
        const mediaBackup = (post.media_urls_backup as string[]) || [];

        const allUrls = mediaBackup.length > 0 ? [...mediaBackup] : [...imageUrls];
        mediaItems.forEach((item: any) => {
          if (item?.url && !allUrls.includes(item.url)) {
            allUrls.push(item.url);
          }
        });

        if (allUrls.length > 0) {
          setMediaPreviewUrls(allUrls);
          setMediaSources(allUrls.map(() => 'url' as MediaSource));

          toast.info('A carregar imagens...');
          const filePromises = allUrls.map((url) => fetchImageAsFile(url));
          const files = await Promise.all(filePromises);
          const validFiles = files.filter((f): f is File => f !== null);

          if (validFiles.length > 0) {
            setMediaFiles(validFiles);
            const aspectRatios = await Promise.all(
              validFiles.map((file) =>
                file.type.startsWith('video/')
                  ? detectVideoAspectRatio(file)
                  : detectImageAspectRatio(file),
              ),
            );
            setMediaAspectRatios(aspectRatios);
          }
        }

        const networks = post.selected_networks || [];
        const postType = post.post_type || 'carousel';

        const formats: PostFormat[] = [];
        networks.forEach((network: string) => {
          const formatMap: Record<string, Record<string, PostFormat>> = {
            instagram: {
              carousel: 'instagram_carousel',
              image: 'instagram_image',
              reel: 'instagram_reel',
              stories: 'instagram_stories',
              video: 'instagram_reel',
            },
            linkedin: {
              carousel: 'linkedin_document',
              post: 'linkedin_post',
              image: 'linkedin_post',
              document: 'linkedin_document',
            },
            youtube: {
              shorts: 'youtube_shorts',
              video: 'youtube_video',
            },
            tiktok: {
              video: 'tiktok_video',
            },
            facebook: {
              image: 'facebook_image',
              stories: 'facebook_stories',
              reel: 'facebook_reel',
              video: 'facebook_reel',
            },
            googlebusiness: {
              post: 'googlebusiness_post',
              image: 'googlebusiness_post',
            },
          };

          const networkFormats = formatMap[network];
          if (networkFormats) {
            const fmt = networkFormats[postType] || Object.values(networkFormats)[0];
            if (fmt && !formats.includes(fmt)) {
              formats.push(fmt);
            }
          }
        });

        if (formats.length > 0) {
          setSelectedFormats(formats);
        }

        setScheduleAsap(true);
        setRecoveredPostId(postId);

        if (formats.length > 0) {
          setVisitedSteps([1, 2]);
          setCurrentStep(2);
          if (allUrls.length > 0) {
            setVisitedSteps([1, 2, 3]);
            setCurrentStep(3);
          }
        }

        toast.success('Conteúdo recuperado com sucesso!', {
          description: `${allUrls.length} ficheiros carregados`,
        });
      } catch (err) {
        console.error('Error loading post for recovery:', err);
        toast.error('Erro ao recuperar conteúdo');
      } finally {
        setIsRecovering(false);
      }
    },
    [
      fetchImageAsFile,
      setCaption,
      setCurrentStep,
      setMediaAspectRatios,
      setMediaFiles,
      setMediaPreviewUrls,
      setMediaSources,
      setNetworkCaptions,
      setScheduleAsap,
      setSelectedFormats,
      setUseSeparateCaptions,
      setVisitedSteps,
    ],
  );

  // Load post on mount when ?recover=<id> is present
  useEffect(() => {
    if (recoverPostId && !recoveredPostId) {
      loadPostForRecovery(recoverPostId);
    }
  }, [recoverPostId, recoveredPostId, loadPostForRecovery]);

  const handleLoadDraft = useCallback(
    async (draft: any) => {
      let fmt: PostFormat;
      if (draft.platform === 'instagram_carrousel') fmt = 'instagram_carousel';
      else if (draft.platform === 'instagram_stories') fmt = 'instagram_stories';
      else if (draft.platform === 'linkedin') fmt = 'linkedin_post';
      else if (draft.platform === 'linkedin_document') fmt = 'linkedin_document';
      else fmt = 'instagram_carousel';

      setSelectedFormats([fmt]);
      setCaption(draft.caption || '');
      setScheduleAsap(draft.publish_immediately ?? true);

      if (draft.scheduled_date) {
        setScheduledDate(new Date(draft.scheduled_date));
      }
      if (draft.scheduled_time) {
        setTime(draft.scheduled_time);
      }

      setCurrentDraftId(draft.id);

      const urls = draft.media_urls || [];
      if (urls.length > 0) {
        setMediaPreviewUrls(urls);
        setMediaSources(urls.map(() => 'url' as MediaSource));

        toast.info('A carregar ficheiros do rascunho...');
        const filePromises = urls.map((url: string) => fetchImageAsFile(url));
        const files = await Promise.all(filePromises);
        const validFiles = files.filter((f): f is File => f !== null);

        if (validFiles.length > 0) {
          setMediaFiles(validFiles);
          const aspectRatios = await Promise.all(
            validFiles.map((file) =>
              file.type.startsWith('video/')
                ? detectVideoAspectRatio(file)
                : detectImageAspectRatio(file),
            ),
          );
          setMediaAspectRatios(aspectRatios);

          setVisitedSteps([1, 2, 3]);
          setCurrentStep(3);

          toast.success('Rascunho carregado!', {
            description: `${validFiles.length} ficheiros carregados`,
          });
        } else {
          toast.warning('Não foi possível carregar os ficheiros do rascunho');
        }
      } else {
        setVisitedSteps([1, 2]);
        setCurrentStep(2);
        toast.success('Rascunho carregado!');
      }
    },
    [
      fetchImageAsFile,
      setCaption,
      setCurrentStep,
      setMediaAspectRatios,
      setMediaFiles,
      setMediaPreviewUrls,
      setMediaSources,
      setScheduleAsap,
      setScheduledDate,
      setSelectedFormats,
      setTime,
      setVisitedSteps,
    ],
  );

  // Load draft from sessionStorage when coming from /drafts page
  useEffect(() => {
    const savedDraft = sessionStorage.getItem('editDraft');
    if (savedDraft && !recoverPostId) {
      try {
        const draft = JSON.parse(savedDraft);
        sessionStorage.removeItem('editDraft');
        handleLoadDraft(draft);
      } catch (err) {
        console.error('Error loading draft from sessionStorage:', err);
        sessionStorage.removeItem('editDraft');
      }
    }
  }, [handleLoadDraft, recoverPostId]);

  return {
    isRecovering,
    recoveredPostId,
    setRecoveredPostId,
    currentDraftId,
    setCurrentDraftId,
    fetchImageAsFile,
    loadPostForRecovery,
    handleLoadDraft,
  };
}
