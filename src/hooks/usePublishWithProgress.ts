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
    
    if (formats.length === 0 || mediaFiles.length === 0) {
      toast.error('Selecione formatos e adicione ficheiros');
      return false;
    }
    
    setIsPublishing(true);
    setShouldCancel(false);
    
    // Initialize platforms for phase 2
    const initialPlatforms: PlatformResult[] = formats.map(format => ({
      platform: FORMAT_TO_NETWORK[format] || 'instagram',
      format,
      formatLabel: getFormatConfig(format)?.label || format,
      status: 'pending',
    }));
    
    setProgress({
      phase1: { status: 'uploading', progress: 0, message: 'A enviar ficheiros...' },
      phase2: { status: 'waiting', progress: 0, message: 'A aguardar envio...', platforms: initialPlatforms },
      summary: { totalPlatforms: formats.length, successCount: 0, failedCount: 0 },
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
      
      // Sort formats: LinkedIn first, Instagram last
      const sortedFormats = [...formats].sort((a, b) => {
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
        toast.info('A preparar Instagram (aguarde 3s)...', { duration: 3000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      let pdfUrl: string | null = null;
      
      for (let i = 0; i < sortedFormats.length; i++) {
        if (shouldCancel) break;
        
        const format = sortedFormats[i];
        const network = FORMAT_TO_NETWORK[format] || 'instagram';
        const previousNetwork = i > 0 ? (FORMAT_TO_NETWORK[sortedFormats[i - 1]] || 'instagram') : null;
        
        // Add delay before Instagram
        if (network === 'instagram') {
          const isConsecutiveInstagram = previousNetwork === 'instagram';
          if (isConsecutiveInstagram) {
            toast.info('A aguardar 10s entre publicações Instagram...', { duration: 10000 });
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else if (previousNetwork && previousNetwork !== 'instagram') {
            toast.info('A aguardar 8s antes do Instagram...', { duration: 8000 });
            await new Promise(resolve => setTimeout(resolve, 8000));
          }
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
        
        // Publish to Getlate
        try {
          const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-to-getlate', {
            body: {
              format,
              caption,
              media_urls: finalMediaUrls,
              scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : undefined,
              scheduled_time: time || undefined,
              publish_immediately: scheduleAsap || !scheduledDate,
            },
          });
          
          if (publishError) {
            updatePlatformStatus(format, 'error', 'Erro de comunicação');
          } else if (!publishResult?.success) {
            updatePlatformStatus(format, 'error', publishResult?.error || 'Falha na publicação');
          } else {
            updatePlatformStatus(format, 'success', undefined, publishResult?.postUrl || publishResult?.url);
          }
        } catch (err) {
          updatePlatformStatus(format, 'error', 'Erro inesperado');
        }
      }
      
      // Save to database
      const finalPlatforms = progress.phase2.platforms;
      const successfulFormats = finalPlatforms.filter(p => p.status === 'success');
      
      if (successfulFormats.length > 0) {
        const selectedNetworks = [...new Set(formats.map(f => FORMAT_TO_NETWORK[f] || 'instagram'))];
        
        const postData = {
          user_id: user.id,
          post_type: formats.some(f => f.includes('carousel') || f === 'linkedin_document') ? 'carousel' : 
                     formats.some(f => f.includes('video') || f.includes('reel') || f.includes('shorts')) ? 'video' : 'image',
          selected_networks: selectedNetworks as any,
          caption,
          scheduled_date: scheduledDate?.toISOString() || new Date().toISOString(),
          schedule_asap: scheduleAsap || !scheduledDate,
          status: 'published',
          origin_mode: 'manual',
          tema: 'Manual post',
          template_a_images: mediaUrls,
          template_b_images: [],
          workflow_id: `manual-${Date.now()}`,
          published_at: new Date().toISOString(),
          publish_metadata: {
            published_via: 'manual_create_getlate',
            formats,
            pdf_generated: !!pdfUrl,
          },
        };
        
        const { error: dbError } = await supabase.from('posts').insert(postData);
        if (dbError) console.error('[usePublishWithProgress] DB insert error:', dbError);
      }
      
      setIsPublishing(false);
      return true;
      
    } catch (error) {
      console.error('[usePublishWithProgress] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro inesperado';
      updatePhase1('error', progress.phase1.progress, 'Erro', errorMsg);
      setIsPublishing(false);
      return false;
    }
  }, [shouldCancel, updatePhase1, updatePhase2, updatePlatformStatus, progress.phase2.platforms, progress.phase1.progress]);
  
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
