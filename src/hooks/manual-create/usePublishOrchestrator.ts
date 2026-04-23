import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateSafeStoragePath } from '@/lib/fileNameSanitizer';
import { extractVideoFrame } from '@/lib/media/videoFrameExtractor';
import { getNetworkFromFormat, PostFormat } from '@/types/social';
import { ValidationSummary } from '@/lib/validation/types';
import type { useImageCompression } from './useImageCompression';
import type { usePublishWithProgress } from '@/hooks/usePublishWithProgress';
import type { usePublishingQuota } from '@/hooks/usePublishingQuota';

type ExecutePublish = ReturnType<typeof usePublishWithProgress>['publish'];
type CompressionApi = ReturnType<typeof useImageCompression>;
type QuotaApi = ReturnType<typeof usePublishingQuota>;
type DuplicateInfo = { id: string; created_at: string; selected_networks: string[] | null; status: string | null };
type PublishParams = Parameters<ExecutePublish>[0];
type DraftMediaItem = { url: string; type: 'image' | 'video'; thumbnail_url?: string | null; name?: string };

const getDraftPlatform = (format: PostFormat) => format;

const getDraftCaption = (format: PostFormat, caption: string, networkCaptions: Record<string, string>, useSeparateCaptions: boolean) => {
  const network = getNetworkFromFormat(format);
  return useSeparateCaptions && networkCaptions[network] ? networkCaptions[network] : caption;
};

interface OrchestratorParams {
  // Inputs (lidos a cada chamada)
  selectedFormats: PostFormat[];
  selectedNetworks: string[];
  caption: string;
  networkCaptions: Record<string, string>;
  useSeparateCaptions: boolean;
  mediaFiles: File[];
  scheduledDate: Date | undefined;
  time: string;
  scheduleAsap: boolean;
  recoveredPostId: string | null;
  currentDraftId: string | null;

  // Dependências (hooks)
  smartValidation: ValidationSummary;
  compression: CompressionApi;
  executePublish: ExecutePublish;
  quota: Pick<QuotaApi, 'instagram' | 'linkedin' | 'isUnlimited' | 'refresh'>;

  // Setters (reset pós-sucesso)
  setCurrentDraftId: (v: string | null) => void;
  setCaption: (v: string) => void;
  setMediaFiles: (v: File[]) => void;
  setMediaPreviewUrls: (v: string[]) => void;
  setScheduledDate: (v: Date | undefined) => void;
  setTime: (v: string) => void;
  setScheduleAsap: (v: boolean) => void;
  setUploadProgress: (v: number) => void;

  // Callbacks UI
  setValidationSheetOpen: (v: boolean) => void;
  onDuplicateDetected: (warning: DuplicateInfo, params: PublishParams) => void;
  onNavigateAfterSubmit: () => void;
}

/**
 * Orquestrador dos 3 fluxos de publicação de `ManualCreate`:
 *  - saveDraft: upload + insert/update em `posts_drafts` + `media_library`
 *  - submitForApproval: upload + edge `submit-to-n8n` + insert `posts` (waiting_for_approval)
 *  - publishNow: pré-check oversized → `executePublish` + handle duplicados + refresh quota
 *
 * Mantém estado próprio para `saving` e `submitting`.
 * Lógica trasladada literalmente da versão inline em `ManualCreate.tsx` (Fase 2).
 */
export function usePublishOrchestrator(params: OrchestratorParams) {
  const {
    selectedFormats,
    selectedNetworks,
    caption,
    networkCaptions,
    useSeparateCaptions,
    mediaFiles,
    scheduledDate,
    time,
    scheduleAsap,
    recoveredPostId,
    currentDraftId,
    smartValidation,
    compression,
    executePublish,
    quota,
    setCurrentDraftId,
    setCaption,
    setMediaFiles,
    setMediaPreviewUrls,
    setScheduledDate,
    setTime,
    setScheduleAsap,
    setUploadProgress,
    setValidationSheetOpen,
    onDuplicateDetected,
    onNavigateAfterSubmit,
  } = params;

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── saveDraft ──────────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    if (selectedFormats.length === 0) {
      toast.error('Selecione pelo menos um formato');
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(0);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('[saveDraft] Session error:', sessionError);
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }
      const user = sessionData.session.user;

      const mediaUrls: string[] = [];
      const draftMediaItems: DraftMediaItem[] = [];
      const totalFiles = mediaFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = generateSafeStoragePath(user.id, file);

        setUploadProgress(Math.round((i / totalFiles) * 100));

        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);

        if (uploadError) {
          console.error('[saveDraft] Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
        const isVideo = file.type.startsWith('video/');
        let thumbnailUrl: string | null = null;

        if (isVideo) {
          try {
            const frameFile = await extractVideoFrame(file);
            const frameName = generateSafeStoragePath(user.id, frameFile);
            const { error: frameUploadError } = await supabase.storage.from('post-covers').upload(frameName, frameFile);
            if (!frameUploadError) {
              const { data: { publicUrl: framePublicUrl } } = supabase.storage.from('post-covers').getPublicUrl(frameName);
              thumbnailUrl = framePublicUrl;
            }
          } catch (frameError) {
            console.warn('[saveDraft] Failed to generate video thumbnail:', frameError);
          }
        }

        draftMediaItems.push({
          url: publicUrl,
          type: isVideo ? 'video' : 'image',
          thumbnail_url: thumbnailUrl,
          name: file.name,
        });
      }

      setUploadProgress(100);

      const primaryFormat = selectedFormats[0];
      const platform = getDraftPlatform(primaryFormat);

      const draftData: {
        user_id: string;
        platform: string;
        format: string;
        formats: string[];
        caption: string;
        media_urls: string[];
        media_items: DraftMediaItem[];
        network_captions: Record<string, string>;
        use_separate_captions: boolean;
        scheduled_date: string | null;
        scheduled_time: string | null;
        publish_immediately: boolean;
        status: 'draft';
      } = {
        user_id: user.id,
        platform,
        format: primaryFormat,
        formats: selectedFormats,
        caption: getDraftCaption(primaryFormat, caption, networkCaptions, useSeparateCaptions),
        media_urls: mediaUrls,
        media_items: draftMediaItems,
        network_captions: useSeparateCaptions ? networkCaptions : {},
        use_separate_captions: useSeparateCaptions,
        scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
        scheduled_time: time || null,
        publish_immediately: scheduleAsap,
        status: 'draft',
      };

      const validDraftId = currentDraftId && !currentDraftId.startsWith('autosave-') ? currentDraftId : null;

      if (validDraftId) {
        const { error } = await supabase
          .from('posts_drafts')
          .update(draftData)
          .eq('id', validDraftId);
        if (error) {
          console.error('[saveDraft] Update error:', error);
          throw error;
        }
        toast.success('Rascunho atualizado com sucesso');
      } else {
        const { data: insertedDraft, error } = await supabase
          .from('posts_drafts')
          .insert(draftData)
          .select('id')
          .single();
        if (error) {
          console.error('[saveDraft] Insert error:', error);
          throw error;
        }
        if (currentDraftId && currentDraftId.startsWith('autosave-')) {
          setCurrentDraftId(null);
        }
        toast.success('Rascunho guardado com sucesso');

        if (mediaUrls.length > 0) {
          const mediaEntries = mediaUrls.map((url, idx) => {
            const fileName = url.split('/').pop() || `draft-${idx}`;
            const file = mediaFiles[idx];
            const isVideo = file?.type?.startsWith('video/') || url.includes('.mp4') || url.includes('.mov');
            return {
              user_id: user.id,
              file_name: fileName,
              file_url: url,
              file_type: isVideo ? 'video' : 'image',
              source: 'publication',
              is_favorite: false,
            };
          });

          const { error: mediaError } = await supabase.from('media_library').insert(mediaEntries);
          if (mediaError) {
            console.warn('[saveDraft] Failed to register media in library:', mediaError);
          } else {
            console.log(`[saveDraft] Registered ${mediaEntries.length} files in media library`);
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; statusCode?: number; details?: string; hint?: string; name?: string; stack?: string };
      console.error('[saveDraft] Error details:', {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        details: err?.details,
        hint: err?.hint,
        name: err?.name,
        stack: err?.stack,
      });

      if (err?.message?.includes('uuid')) {
        toast.error('Erro interno. O rascunho será guardado como novo.');
        setCurrentDraftId(null);
      } else if (err?.message?.includes('JWT') || err?.message?.includes('session') || err?.code === 'PGRST301') {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err?.message?.includes('storage') || err?.message?.includes('bucket') || err?.statusCode === 413) {
        toast.error('Erro no upload. Verifique o tamanho dos ficheiros (máx 50MB).');
      } else if (err?.message?.includes('timeout') || err?.code === 'ETIMEDOUT') {
        toast.error('Ligação lenta. Tente novamente com ficheiros mais pequenos.');
      } else if (err?.statusCode === 403) {
        toast.error('Sem permissão para guardar. Contacte o suporte.');
      } else {
        toast.error(`Erro ao guardar: ${err?.message || 'Verifique a sua ligação.'}`);
      }
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  }, [
    selectedFormats, mediaFiles, useSeparateCaptions, networkCaptions, caption,
    scheduledDate, time, scheduleAsap, currentDraftId,
    setUploadProgress, setCurrentDraftId,
  ]);

  // ── submitForApproval ──────────────────────────────────────────────────
  const submitForApproval = useCallback(async () => {
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de submeter');
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Tem de iniciar sessão para submeter.');
        return;
      }

      toast.loading('A carregar ficheiros...', { id: 'upload' });
      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = generateSafeStoragePath(user.id, file);

        setUploadProgress(Math.round((i / totalFiles) * 50));

        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);

        if (uploadError) {
          toast.dismiss('upload');
          throw new Error(`Erro ao carregar ${file.name}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      toast.dismiss('upload');
      setUploadProgress(50);

      const primaryFormat = selectedFormats[0];
      let platform: string;
      if (primaryFormat.startsWith('instagram_')) platform = 'instagram_carousel';
      else if (primaryFormat.startsWith('linkedin_')) platform = 'linkedin';
      else if (primaryFormat.startsWith('youtube_')) platform = 'youtube';
      else if (primaryFormat.startsWith('tiktok_')) platform = 'tiktok';
      else if (primaryFormat.startsWith('facebook_')) platform = 'facebook';
      else platform = 'instagram_carousel';

      let scheduledDateStr = '';
      let scheduledTimeStr = '';

      if (!scheduleAsap && scheduledDate) {
        scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');
        scheduledTimeStr = time;
      }

      setUploadProgress(60);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      toast.loading('A submeter publicação...', { id: 'submit' });
      setUploadProgress(80);

      const { data, error } = await supabase.functions.invoke('submit-to-n8n', {
        body: {
          platform,
          caption: useSeparateCaptions && networkCaptions[platform] ? networkCaptions[platform] : caption,
          media_urls: mediaUrls,
          scheduled_date: scheduledDateStr || undefined,
          scheduled_time: scheduledTimeStr || undefined,
          publish_immediately: scheduleAsap,
          formats: selectedFormats,
          network_captions: useSeparateCaptions ? networkCaptions : undefined,
        },
      });

      if (error) {
        toast.dismiss('submit');
        throw new Error('Erro ao comunicar com o servidor');
      }

      if (!data?.success) {
        toast.dismiss('submit');
        throw new Error(data?.error || 'Falha ao submeter para aprovação');
      }

      toast.dismiss('submit');
      setUploadProgress(90);

      const postData = {
        user_id: user.id,
        post_type: primaryFormat.includes('carousel')
          ? 'carousel'
          : primaryFormat.includes('video') || primaryFormat.includes('reel')
            ? 'video'
            : 'image',
        selected_networks: selectedNetworks,
        caption,
        linkedin_body: useSeparateCaptions && networkCaptions.linkedin ? networkCaptions.linkedin : null,
        scheduled_date: scheduledDate?.toISOString() || null,
        schedule_asap: scheduleAsap,
        status: 'waiting_for_approval',
        origin_mode: 'manual',
        tema: 'Manual post',
        template_a_images: mediaUrls,
        template_b_images: [],
        workflow_id: 'manual-' + Date.now(),
      };

      console.log('[submitForApproval] Inserting post with user_id:', user.id);
      const { error: dbError } = await supabase.from('posts').insert(postData);
      if (dbError) {
        console.error('DB insert error:', dbError);
        toast.error('Erro ao guardar publicação na base de dados');
      } else {
        if (mediaUrls.length > 0) {
          const mediaEntries = mediaUrls.map((url, idx) => {
            const fileName = url.split('/').pop() || `media-${idx}`;
            const file = mediaFiles[idx];
            const isVideo = file?.type?.startsWith('video/') || url.includes('.mp4') || url.includes('.mov');
            return {
              user_id: user.id,
              file_name: fileName,
              file_url: url,
              file_type: isVideo ? 'video' : 'image',
              source: 'publication',
              is_favorite: false,
            };
          });

          const { error: mediaError } = await supabase.from('media_library').insert(mediaEntries);
          if (mediaError) {
            console.warn('[submitForApproval] Failed to register media in library:', mediaError);
          } else {
            console.log(`[submitForApproval] Registered ${mediaEntries.length} files in media library`);
          }
        }
      }

      setUploadProgress(100);

      toast.success('Publicação submetida para aprovação com sucesso!', { duration: 4000 });

      if (!currentDraftId) {
        setCaption('');
        setMediaFiles([]);
        setMediaPreviewUrls([]);
        setScheduledDate(undefined);
        setTime('12:00');
        setScheduleAsap(false);
      }

      setTimeout(() => onNavigateAfterSubmit(), 1500);
    } catch (error) {
      console.error('Error submitting:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao submeter. Tente novamente.';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }, [
    selectedFormats, smartValidation.canPublish, mediaFiles, scheduleAsap,
    scheduledDate, time, useSeparateCaptions, networkCaptions, caption,
    selectedNetworks, currentDraftId,
    setValidationSheetOpen, setUploadProgress, setCaption, setMediaFiles,
    setMediaPreviewUrls, setScheduledDate, setTime, setScheduleAsap,
    onNavigateAfterSubmit,
  ]);

  // ── publishNow ─────────────────────────────────────────────────────────
  const publishNow = useCallback(async (filesToPublish?: File[]) => {
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de publicar');
      return;
    }

    const files = filesToPublish || mediaFiles;

    // Pré-check de imagens grandes (>4MB) — apenas para Instagram
    const instagramSelected = selectedNetworks.includes('instagram');
    if (instagramSelected && !filesToPublish) {
      const triggered = compression.requestCompressionIfNeeded(files);
      if (triggered) return; // Aguardar confirmação no modal
    }

    console.log('[Publish] Quota info (reference only):', {
      instagramRemaining: quota.instagram.quota.remaining,
      linkedinRemaining: quota.linkedin.quota.remaining,
      isUnlimited: quota.isUnlimited,
    });

    const publishParams: PublishParams = {
      formats: selectedFormats,
      caption,
      mediaFiles: files,
      scheduledDate,
      time,
      scheduleAsap,
      recoveredFromPostId: recoveredPostId || undefined,
      networkCaptions: useSeparateCaptions ? networkCaptions : undefined,
    };

    const result = await executePublish(publishParams);

    if (result && typeof result === 'object' && 'duplicate' in result) {
      onDuplicateDetected(result.duplicate as DuplicateInfo, publishParams);
      return;
    }

    if (result === true) {
      await quota.refresh();
    }
  }, [
    selectedFormats, smartValidation.canPublish, mediaFiles, selectedNetworks,
    compression, quota, caption, scheduledDate, time, scheduleAsap,
    recoveredPostId, useSeparateCaptions, networkCaptions, executePublish,
    setValidationSheetOpen, onDuplicateDetected,
  ]);

  // ── Wrappers com gating de smart-validation ────────────────────────────
  const publishWithValidation = useCallback(async () => {
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de publicar');
      return;
    }
    await publishNow();
  }, [selectedFormats, smartValidation.canPublish, setValidationSheetOpen, publishNow]);

  const submitWithValidation = useCallback(async () => {
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de submeter');
      return;
    }
    await submitForApproval();
  }, [selectedFormats, smartValidation.canPublish, setValidationSheetOpen, submitForApproval]);

  return {
    // estado
    saving,
    submitting,
    // acções
    saveDraft,
    publishNow,
    submitForApproval,
    publishWithValidation,
    submitWithValidation,
  };
}
