import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat, getFormatConfig } from '@/types/social';
import { FORMAT_TO_NETWORK } from '@/types/publishing';
import { generateCarouselPDF } from '@/lib/pdfGenerator';
import { 
  PublishProgress, 
  Phase1Status, 
  Phase2Status, 
  PlatformResult,
  PlatformStatus 
} from '@/components/publishing/PublishProgressModal';
import { toast } from 'sonner';

// Initial state
const initialProgress: PublishProgress = {
  phase1: {
    status: 'idle',
    progress: 0,
    message: 'A aguardar...',
  },
  phase2: {
    status: 'idle',
    progress: 0,
    message: 'A aguardar envio...',
    platforms: [],
  },
  summary: {
    totalPlatforms: 0,
    successCount: 0,
    failedCount: 0,
  },
};

interface PublishParams {
  formats: PostFormat[];
  caption: string;
  mediaFiles: File[];
  scheduledDate?: Date;
  time?: string;
  scheduleAsap: boolean;
}

// Extract first frame from video file
async function extractVideoFrame(videoFile: File | string): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    const cleanup = () => {
      if (typeof videoFile !== 'string') {
        URL.revokeObjectURL(video.src);
      }
    };
    
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => {
            cleanup();
            if (blob) {
              const fileName = typeof videoFile === 'string' 
                ? 'video-frame.jpg' 
                : videoFile.name.replace(/\.[^.]+$/, '-frame.jpg');
              resolve(new File([blob], fileName, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Could not create blob from canvas'));
            }
          },
          'image/jpeg',
          0.9
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video'));
    };
    
    video.src = typeof videoFile === 'string' ? videoFile : URL.createObjectURL(videoFile);
    video.load();
  });
}

export function usePublishWithProgress() {
  const [progress, setProgress] = useState<PublishProgress>(initialProgress);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shouldCancel, setShouldCancel] = useState(false);
  
  // Update phase 1
  const updatePhase1 = useCallback((status: Phase1Status, progressValue: number, message: string, errorMessage?: string) => {
    setProgress(prev => ({
      ...prev,
      phase1: { status, progress: progressValue, message, errorMessage },
    }));
  }, []);
  
  // Update phase 2
  const updatePhase2 = useCallback((status: Phase2Status, progressValue: number, message: string, platforms?: PlatformResult[]) => {
    setProgress(prev => ({
      ...prev,
      phase2: { 
        status, 
        progress: progressValue, 
        message,
        platforms: platforms || prev.phase2.platforms,
      },
    }));
  }, []);
  
  // Update single platform status
  const updatePlatformStatus = useCallback((format: string, status: PlatformStatus, errorMessage?: string, postUrl?: string) => {
    setProgress(prev => {
      const updatedPlatforms = prev.phase2.platforms.map(p => 
        p.format === format ? { ...p, status, errorMessage, postUrl } : p
      );
      
      const successCount = updatedPlatforms.filter(p => p.status === 'success').length;
      const failedCount = updatedPlatforms.filter(p => p.status === 'error').length;
      const totalComplete = successCount + failedCount;
      const totalPlatforms = updatedPlatforms.length;
      
      // Calculate phase 2 progress based on completed platforms
      const phase2Progress = totalPlatforms > 0 ? Math.round((totalComplete / totalPlatforms) * 100) : 0;
      
      // Determine phase 2 status
      let phase2Status: Phase2Status = prev.phase2.status;
      if (totalComplete === totalPlatforms && totalPlatforms > 0) {
        if (failedCount === 0) {
          phase2Status = 'success';
        } else if (successCount > 0) {
          phase2Status = 'partial';
        } else {
          phase2Status = 'error';
        }
      }
      
      return {
        ...prev,
        phase2: {
          ...prev.phase2,
          status: phase2Status,
          progress: phase2Progress,
          platforms: updatedPlatforms,
          message: phase2Status === 'success' 
            ? `Publicado em ${successCount} de ${totalPlatforms} plataformas`
            : phase2Status === 'partial'
            ? `Publicado em ${successCount} de ${totalPlatforms} plataformas`
            : phase2Status === 'error'
            ? 'Falha na publicação'
            : `A publicar... (${totalComplete}/${totalPlatforms})`,
        },
        summary: {
          totalPlatforms,
          successCount,
          failedCount,
        },
      };
    });
  }, []);
  
  // Main publish function
  const publish = useCallback(async (params: PublishParams): Promise<boolean> => {
    const { formats, caption, mediaFiles, scheduledDate, time, scheduleAsap } = params;
    
    // Generate unique publish session ID for logging and idempotency
    const publishSessionId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`[usePublishWithProgress] ════════════════════════════════════════`);
    console.log(`[usePublishWithProgress] Starting publish session: ${publishSessionId}`);
    console.log(`[usePublishWithProgress] Timestamp: ${new Date().toISOString()}`);
    console.log(`[usePublishWithProgress] Formats requested: ${formats.join(', ')}`);
    console.log(`[usePublishWithProgress] Media files: ${mediaFiles.length}`);
    console.log(`[usePublishWithProgress] ════════════════════════════════════════`);
    
    if (formats.length === 0 || mediaFiles.length === 0) {
      toast.error('Selecione formatos e adicione ficheiros');
      return false;
    }
    
    // Prevent double-publishing if already in progress
    if (isPublishing) {
      console.warn(`[usePublishWithProgress] ⚠️ Publish already in progress! Ignoring duplicate call.`);
      toast.warning('Publicação já em progresso');
      return false;
    }
    
    setIsPublishing(true);
    setShouldCancel(false);
    
    // CONSOLIDATE: Only one format per network to avoid duplicate publications
    const uniqueNetworkFormats = new Map<string, PostFormat>();
    for (const format of formats) {
      const network = FORMAT_TO_NETWORK[format] || 'instagram';
      // Keep the first format for each network (usually most specific)
      if (!uniqueNetworkFormats.has(network)) {
        uniqueNetworkFormats.set(network, format);
      }
    }
    const consolidatedFormats = Array.from(uniqueNetworkFormats.values());
    
    console.log(`[usePublishWithProgress] [${publishSessionId}] Consolidated formats:`, {
      original: formats,
      consolidated: consolidatedFormats,
      networks: Array.from(uniqueNetworkFormats.keys()),
    });
    
    // Initialize platforms for phase 2 with consolidated formats
    const initialPlatforms: PlatformResult[] = consolidatedFormats.map(format => ({
      platform: FORMAT_TO_NETWORK[format] || 'instagram',
      format,
      formatLabel: getFormatConfig(format)?.label || format,
      status: 'pending',
    }));
    
    // Track results directly to avoid stale state issues
    const platformResults: Map<string, PlatformResult> = new Map();
    consolidatedFormats.forEach(format => {
      platformResults.set(format, {
        platform: FORMAT_TO_NETWORK[format] || 'instagram',
        format,
        formatLabel: getFormatConfig(format)?.label || format,
        status: 'pending',
      });
    });
    
    setProgress({
      phase1: { status: 'uploading', progress: 0, message: 'A enviar ficheiros...' },
      phase2: { status: 'waiting', progress: 0, message: 'A aguardar envio...', platforms: initialPlatforms },
      summary: { totalPlatforms: consolidatedFormats.length, successCount: 0, failedCount: 0 },
    });
    
    try {
      // ═══════════════════════════════════════════
      // PHASE 1: Upload files
      // ═══════════════════════════════════════════
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        updatePhase1('error', 0, 'Erro de autenticação', 'Tem de iniciar sessão para publicar');
        setIsPublishing(false);
        return false;
      }
      
      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        if (shouldCancel) {
          updatePhase1('error', Math.round((i / totalFiles) * 80), 'Cancelado', 'Publicação cancelada');
          setIsPublishing(false);
          return false;
        }
        
        const file = mediaFiles[i];
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const uploadProgress = Math.round(((i + 0.5) / totalFiles) * 80);
        
        updatePhase1('uploading', uploadProgress, `A enviar ficheiro ${i + 1} de ${totalFiles}...`);
        
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) {
          updatePhase1('error', uploadProgress, 'Erro no upload', `Erro ao carregar ${file.name}`);
          setIsPublishing(false);
          return false;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
        
        mediaUrls.push(publicUrl);
        updatePhase1('uploading', Math.round(((i + 1) / totalFiles) * 80), `Ficheiro ${i + 1} de ${totalFiles} enviado`);
      }
      
      // Phase 1 almost complete
      updatePhase1('sending', 90, 'A preparar publicação...');
      
      // Sort consolidated formats: LinkedIn first, Instagram last
      const sortedFormats = [...consolidatedFormats].sort((a, b) => {
        const aNetwork = FORMAT_TO_NETWORK[a] || 'instagram';
        const bNetwork = FORMAT_TO_NETWORK[b] || 'instagram';
        if (aNetwork === 'instagram' && bNetwork !== 'instagram') return 1;
        if (bNetwork === 'instagram' && aNetwork !== 'instagram') return -1;
        if (aNetwork === 'linkedin' && bNetwork !== 'linkedin') return -1;
        if (bNetwork === 'linkedin' && aNetwork !== 'linkedin') return 1;
        return 0;
      });
      
      // Phase 1 complete
      updatePhase1('success', 100, 'Ficheiros enviados com sucesso');
      
      // ═══════════════════════════════════════════
      // PHASE 2: Publish to platforms
      // ═══════════════════════════════════════════
      
      updatePhase2('publishing', 0, 'A publicar nas redes sociais...');
      
      // Check if Instagram is selected - add initial delay
      const hasInstagram = sortedFormats.some(f => (FORMAT_TO_NETWORK[f] || 'instagram') === 'instagram');
      if (hasInstagram) {
        updatePhase2('publishing', 0, 'A preparar Instagram (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      let pdfUrl: string | null = null;
      
      for (let i = 0; i < sortedFormats.length; i++) {
        if (shouldCancel) break;
        
        const format = sortedFormats[i];
        const network = FORMAT_TO_NETWORK[format] || 'instagram';
        const previousNetwork = i > 0 ? (FORMAT_TO_NETWORK[sortedFormats[i - 1]] || 'instagram') : null;
        
        // Add delay before Instagram with visual feedback
        if (network === 'instagram' && previousNetwork && previousNetwork !== 'instagram') {
          updatePhase2('publishing', Math.round((i / sortedFormats.length) * 100), 'A aguardar 8s antes do Instagram...');
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
        
        // Update platform to processing
        updatePlatformStatus(format, 'processing');
        
        let finalMediaUrls = mediaUrls;
        
        // Generate PDF for LinkedIn Document
        if (format === 'linkedin_document' && mediaUrls.length > 0 && !pdfUrl) {
          try {
            const imageUrlsForPdf: string[] = [];
            
            for (let j = 0; j < mediaFiles.length; j++) {
              const file = mediaFiles[j];
              if (file.type.startsWith('video/')) {
                try {
                  const frameFile = await extractVideoFrame(file);
                  const frameName = `${user.id}/${Date.now()}-frame-${j}.jpg`;
                  
                  const { error: frameUploadError } = await supabase.storage
                    .from('pdfs')
                    .upload(frameName, frameFile, { contentType: 'image/jpeg' });
                  
                  if (!frameUploadError) {
                    const { data: { publicUrl } } = supabase.storage
                      .from('pdfs')
                      .getPublicUrl(frameName);
                    imageUrlsForPdf.push(publicUrl);
                  }
                } catch (frameError) {
                  console.error('Frame extraction error:', frameError);
                }
              } else {
                imageUrlsForPdf.push(mediaUrls[j]);
              }
            }
            
            if (imageUrlsForPdf.length > 0) {
              const pdfBlob = await generateCarouselPDF({ 
                images: imageUrlsForPdf,
                title: 'carousel',
                quality: 0.9 
              });
              
              const pdfFileName = `${user.id}/${Date.now()}-carousel.pdf`;
              const { error: pdfUploadError } = await supabase.storage
                .from('pdfs')
                .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf' });
              
              if (!pdfUploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('pdfs')
                  .getPublicUrl(pdfFileName);
                pdfUrl = publicUrl;
              }
            }
          } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
          }
          
          if (pdfUrl) {
            finalMediaUrls = [pdfUrl];
          }
        }
        
        // Publish to Getlate with idempotency key
        const idempotencyKey = `${publishSessionId}_${format}_${network}`;
        console.log(`[usePublishWithProgress] [${publishSessionId}] Publishing ${format} to ${network} with key: ${idempotencyKey}`);
        
        try {
          const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-to-getlate', {
            body: {
              format,
              caption,
              media_urls: finalMediaUrls,
              scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : undefined,
              scheduled_time: time || undefined,
              publish_immediately: scheduleAsap || !scheduledDate,
              idempotency_key: idempotencyKey,
            },
          });
          
          if (publishError) {
            console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} failed with error:`, publishError);
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: 'error', 
              errorMessage: 'Erro de comunicação' 
            });
            updatePlatformStatus(format, 'error', 'Erro de comunicação');
          } else if (!publishResult?.success) {
            console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} returned failure:`, publishResult?.error);
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: 'error', 
              errorMessage: publishResult?.error || 'Falha na publicação' 
            });
            updatePlatformStatus(format, 'error', publishResult?.error || 'Falha na publicação');
          } else {
            console.log(`[usePublishWithProgress] [${publishSessionId}] ✅ ${format} published successfully`);
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: 'success', 
              postUrl: publishResult?.postUrl || publishResult?.url 
            });
            updatePlatformStatus(format, 'success', undefined, publishResult?.postUrl || publishResult?.url);
          }
        } catch (err) {
          console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} exception:`, err);
          platformResults.set(format, { 
            ...platformResults.get(format)!, 
            status: 'error', 
            errorMessage: 'Erro inesperado' 
          });
          updatePlatformStatus(format, 'error', 'Erro inesperado');
        }
      }
      
      // Use tracked results instead of stale state
      const finalResults = Array.from(platformResults.values());
      const successfulFormats = finalResults.filter(p => p.status === 'success');
      const failedFormats = finalResults.filter(p => p.status === 'error');
      
      console.log(`[usePublishWithProgress] [${publishSessionId}] ════════════════════════════════════════`);
      console.log(`[usePublishWithProgress] [${publishSessionId}] FINAL RESULTS:`);
      console.log(`[usePublishWithProgress] [${publishSessionId}] - Total platforms: ${finalResults.length}`);
      console.log(`[usePublishWithProgress] [${publishSessionId}] - Success: ${successfulFormats.length}`);
      console.log(`[usePublishWithProgress] [${publishSessionId}] - Failed: ${failedFormats.length}`);
      console.log(`[usePublishWithProgress] [${publishSessionId}] ════════════════════════════════════════`);
      
      // Always save post to database (even if some platforms failed)
      if (consolidatedFormats.length > 0) {
        const selectedNetworks = [...new Set(consolidatedFormats.map(f => FORMAT_TO_NETWORK[f] || 'instagram'))];
        const hasSuccess = successfulFormats.length > 0;
        const hasFailed = failedFormats.length > 0;
        
        // Determine final status
        let finalStatus = 'published';
        if (!hasSuccess && hasFailed) {
          finalStatus = 'failed';
        } else if (hasSuccess && hasFailed) {
          finalStatus = 'published'; // Partial success still counts as published
        }
        
        const postData = {
          user_id: user.id,
          post_type: consolidatedFormats.some(f => f.includes('carousel') || f === 'linkedin_document') ? 'carousel' : 
                     consolidatedFormats.some(f => f.includes('video') || f.includes('reel') || f.includes('shorts')) ? 'video' : 'image',
          selected_networks: selectedNetworks,
          caption,
          scheduled_date: new Date().toISOString(),
          schedule_asap: true,
          status: finalStatus,
          origin_mode: 'manual',
          tema: caption.substring(0, 50) || 'Manual post',
          template_a_images: mediaUrls.length > 0 ? mediaUrls : [''],
          template_b_images: [] as string[],
          workflow_id: `manual-${Date.now()}`,
          published_at: hasSuccess ? new Date().toISOString() : null,
          failed_at: hasFailed && !hasSuccess ? new Date().toISOString() : null,
          publish_metadata: JSON.parse(JSON.stringify({
            published_via: 'manual_create_getlate',
            formats: consolidatedFormats,
            pdf_generated: !!pdfUrl,
            successCount: successfulFormats.length,
            failedCount: failedFormats.length,
          })),
        };
        
        console.log('[usePublishWithProgress] Saving post to DB:', JSON.stringify(postData, null, 2));
        
        try {
          const { data: insertedPost, error: dbError } = await supabase
            .from('posts')
            .insert([postData])
            .select('id')
            .maybeSingle();
            
          if (dbError) {
            console.error('[usePublishWithProgress] DB insert error:', dbError.message, dbError.details, dbError.hint);
            // Don't show error toast - publication was successful, just logging failed
          } else {
            console.log('[usePublishWithProgress] Post saved successfully:', insertedPost?.id);
          }
        } catch (insertError) {
          console.error('[usePublishWithProgress] DB insert exception:', insertError);
        }
      }
      
      setIsPublishing(false);
      return successfulFormats.length > 0;
      
    } catch (error) {
      console.error('[usePublishWithProgress] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro inesperado';
      updatePhase1('error', 0, 'Erro', errorMsg);
      setIsPublishing(false);
      return false;
    }
  }, [shouldCancel, updatePhase1, updatePhase2, updatePlatformStatus]);
  
  // Reset progress
  const resetProgress = useCallback(() => {
    setProgress(initialProgress);
    setIsPublishing(false);
    setShouldCancel(false);
  }, []);
  
  // Cancel publishing
  const cancelPublishing = useCallback(() => {
    setShouldCancel(true);
  }, []);
  
  return {
    progress,
    isPublishing,
    publish,
    resetProgress,
    cancelPublishing,
  };
}
