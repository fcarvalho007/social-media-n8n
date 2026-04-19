import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat, getFormatConfig } from '@/types/social';
import { FORMAT_TO_NETWORK } from '@/types/publishing';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';
import { generateCarouselPDF } from '@/lib/pdfGenerator';
import { processMediaForInstagram } from '@/lib/canvas/instagramResize';
import { 
  PublishProgress, 
  Phase1Status, 
  Phase2Status, 
  PlatformResult,
  PlatformStatus 
} from '@/components/publishing/PublishProgressModal';
import { parseStructuredError, classifyErrorFromString, type StructuredError } from '@/lib/publishingErrors';
import { sanitizeFileName } from '@/lib/fileNameSanitizer';
import { toast } from 'sonner';

// Supported MIME types for social media publishing
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/x-m4v'];
const MAX_IMAGE_SIZE_MB = 50; // Accept up to 50MB (compressed on publish)
const MAX_VIDEO_SIZE_MB = 650;

interface UploadDiagnosis {
  causa: string;
  detalhe: string;
  sugestao: string;
}

function diagnoseUploadError(file: File, error: any, safeName: string): UploadDiagnosis {
  const msg = (error?.message || error?.statusCode || '').toString().toLowerCase();
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const isVideo = file.type.startsWith('video/');
  const maxMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Invalid key / filename issues
  if (msg.includes('invalid key') || msg.includes('invalid input')) {
    return {
      causa: 'Nome do ficheiro incompatível',
      detalhe: `"${file.name}" contém caracteres especiais ([], parênteses, acentos ou espaços)`,
      sugestao: 'Renomeie o ficheiro usando apenas letras, números e hífens (ex: meu-video-final.mp4)',
    };
  }

  // 2. File too large
  if (file.size > maxMB * 1024 * 1024 || msg.includes('too large') || msg.includes('payload') || msg.includes('entity too large')) {
    return {
      causa: 'Ficheiro demasiado grande',
      detalhe: `${sizeMB}MB (máximo: ${maxMB}MB para ${isVideo ? 'vídeos' : 'imagens'})`,
      sugestao: `Reduza o tamanho do ficheiro para menos de ${maxMB}MB`,
    };
  }

  // 3. Unsupported format
  const allSupported = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];
  const knownExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'qt', 'm4v'];
  const hasValidExt = knownExts.includes(ext);
  if ((!allSupported.includes(file.type) && !hasValidExt) || msg.includes('mime') || msg.includes('unsupported') || msg.includes('content type')) {
    return {
      causa: 'Formato não suportado',
      detalhe: `Tipo "${file.type || ext}" não é aceite. Formatos válidos: JPG, PNG, WebP, GIF, MP4, MOV`,
      sugestao: 'Converta o ficheiro para MP4 (vídeos) ou JPG/PNG (imagens)',
    };
  }

  // 4. Network/timeout errors
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('abort')) {
    return {
      causa: 'Erro de ligação durante o upload',
      detalhe: 'A ligação foi interrompida durante o envio do ficheiro',
      sugestao: 'Verifique a sua internet e tente novamente',
    };
  }

  // 5. Storage quota
  if (msg.includes('quota') || msg.includes('storage') || msg.includes('space')) {
    return {
      causa: 'Armazenamento cheio',
      detalhe: 'O espaço de armazenamento está esgotado',
      sugestao: 'Liberte espaço nas definições de quota ou contacte o suporte',
    };
  }

  // 6. Generic fallback
  return {
    causa: 'Erro no upload',
    detalhe: `Erro técnico: ${error?.message || 'desconhecido'}`,
    sugestao: 'Tente novamente. Se persistir, renomeie o ficheiro e reduza o tamanho',
  };
}

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

interface DuplicateInfo {
  id: string;
  created_at: string;
  selected_networks: string[] | null;
  status: string | null;
}

interface PublishParams {
  formats: PostFormat[];
  caption: string;
  mediaFiles: File[];
  scheduledDate?: Date;
  time?: string;
  scheduleAsap: boolean;
  recoveredFromPostId?: string; // Track if this is a recovered post
  networkCaptions?: Record<string, string>; // Per-network captions when "Legendas separadas" is active
  skipDuplicateCheck?: boolean; // Skip duplicate detection (user confirmed)
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

// Generate semantic PDF filename from caption
function generateSemanticPdfFilename(caption: string): string {
  const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'para', 'com', 'em', 'que', 'é', 'mais', 'uma', 'um', 'os', 'as', 'no', 'na', 'por', 'se', 'ou', 'ao', 'aos', 'das', 'dos', 'seu', 'sua', 'como', 'mas', 'não', 'nao', 'isso', 'esta', 'este', 'essa', 'esse'];
  
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  
  if (!caption || caption.trim().length === 0) {
    return `carousel-${month}-${year}.pdf`;
  }
  
  // Remove emojis, hashtags, URLs, mentions
  let cleaned = caption
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/#\w+/g, '')
    .replace(/@\w+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .toLowerCase();
  
  // Normalize (remove accents)
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Extract words (only alphabetic, min 3 chars, not in stopwords)
  const words = cleaned
    .split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 3 && !stopwords.includes(w))
    .slice(0, 4);
  
  const slug = words.join('-').substring(0, 40) || 'carousel';
  
  return `${slug}-${month}-${year}-carousel.pdf`;
}

export function usePublishWithProgress() {
  const [progress, setProgress] = useState<PublishProgress>(initialProgress);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shouldCancel, setShouldCancel] = useState(false);
  
  // Use ref for publishing lock - more reliable than state for preventing race conditions
  const publishingLockRef = useRef(false);
  const lastPublishSessionRef = useRef<string | null>(null);
  
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
  const updatePlatformStatus = useCallback((
    format: string, 
    status: PlatformStatus, 
    errorMessage?: string, 
    postUrl?: string,
    structuredError?: StructuredError
  ) => {
    setProgress(prev => {
      const updatedPlatforms = prev.phase2.platforms.map(p => 
        p.format === format ? { ...p, status, errorMessage, postUrl, structuredError } : p
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
  const publish = useCallback(async (params: PublishParams): Promise<boolean | { duplicate: DuplicateInfo }> => {
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
      toast.error('Selecione formatos e adicione ficheiros', { duration: 15000 });
      return false;
    }
    
    // STRICT LOCK: Prevent double-publishing using ref (more reliable than state)
    if (publishingLockRef.current) {
      console.warn(`[usePublishWithProgress] ⚠️ BLOCKED! Publish lock active. Session: ${lastPublishSessionRef.current}`);
      toast.warning('Publicação já em progresso - aguarde');
      return false;
    }
    
    // Also check state as backup
    if (isPublishing) {
      console.warn(`[usePublishWithProgress] ⚠️ BLOCKED! isPublishing state is true.`);
      toast.warning('Publicação já em progresso');
      return false;
    }
    
    // Acquire lock IMMEDIATELY
    publishingLockRef.current = true;
    lastPublishSessionRef.current = publishSessionId;
    setIsPublishing(true);
    setShouldCancel(false);
    
    console.log(`[usePublishWithProgress] 🔒 Lock acquired for session: ${publishSessionId}`);
    
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
      phase1: { status: 'uploading', progress: 0, message: 'A preparar ficheiros...' },
      phase2: { status: 'waiting', progress: 0, message: 'A aguardar envio...', platforms: initialPlatforms },
      summary: { totalPlatforms: consolidatedFormats.length, successCount: 0, failedCount: 0 },
    });
    
    // Variable to track post ID for database updates
    let createdPostId: string | null = null;
    
    // Helper to mark post as failed in DB
    const markPostFailed = async (errorMessage: string) => {
      if (createdPostId) {
        try {
          await supabase.from('posts').update({
            status: 'failed',
            error_log: errorMessage,
            failed_at: new Date().toISOString(),
          }).eq('id', createdPostId);
        } catch (e) {
          console.error('[usePublishWithProgress] Failed to mark post as failed:', e);
        }
      }
    };
    
    try {
      // ═══════════════════════════════════════════
      // PHASE 1: Process and Upload files
      // ═══════════════════════════════════════════
      
      // Robust session check with retry
      let user = null;
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error('[usePublishWithProgress] Session error:', sessionError);
          updatePhase1('error', 0, 'Sessão expirada', 'Por favor, faça login novamente');
          setIsPublishing(false);
          publishingLockRef.current = false;
          toast.error('Sessão expirada. Por favor, faça login novamente.', { duration: 15000 });
          return false;
        }
        user = sessionData.session.user;
      } catch (fetchError: any) {
        console.error('[usePublishWithProgress] Network error during auth check:', fetchError);
        updatePhase1('error', 0, 'Erro de ligação', 'Não foi possível comunicar com o servidor');
        setIsPublishing(false);
        publishingLockRef.current = false;
        toast.error('Erro de ligação. Verifique a sua internet e tente novamente.', { duration: 15000 });
        return false;
      }
      
      if (!user) {
        updatePhase1('error', 0, 'Erro de autenticação', 'Tem de iniciar sessão para publicar');
        setIsPublishing(false);
        publishingLockRef.current = false;
        return false;
      }
      
      // ═══════════════════════════════════════════
      // DUPLICATE CHECK: Detect same caption published in last 30 minutes
      // ═══════════════════════════════════════════
      if (!params.skipDuplicateCheck && caption?.trim()) {
        try {
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: recentDuplicates } = await supabase
            .from('posts')
            .select('id, created_at, selected_networks, status')
            .eq('user_id', user.id)
            .eq('caption', caption)
            .in('status', ['published', 'publishing'])
            .gte('created_at', thirtyMinAgo)
            .limit(1);

          if (recentDuplicates && recentDuplicates.length > 0) {
            console.log(`[usePublishWithProgress] Duplicate detected:`, recentDuplicates[0]);
            // Release lock — user will decide
            publishingLockRef.current = false;
            setIsPublishing(false);
            return { duplicate: recentDuplicates[0] as DuplicateInfo };
          }
        } catch (e) {
          console.warn('[usePublishWithProgress] Duplicate check failed, proceeding:', e);
        }
      }

      // ═══════════════════════════════════════════
      // CREATE POST RECORD EARLY (before upload) so ALL attempts are logged
      // ═══════════════════════════════════════════
      const selectedNetworks = [...new Set(consolidatedFormats.map(f => FORMAT_TO_NETWORK[f] || 'instagram'))];
      const postType = consolidatedFormats.some(f => f.includes('carousel') || f === 'linkedin_document') ? 'carousel' : 
                       consolidatedFormats.some(f => f.includes('video') || f.includes('reel') || f.includes('shorts')) ? 'video' : 'image';
      
      // Determine if this is a scheduled post (future date + not ASAP)
      const isScheduledForLater = !scheduleAsap && scheduledDate && scheduledDate > new Date();
      const initialStatus = isScheduledForLater ? 'scheduled' : 'publishing';
      
      console.log(`[usePublishWithProgress] Publication mode: ${isScheduledForLater ? 'SCHEDULED' : 'IMMEDIATE'}, status: ${initialStatus}`);
      
      const initialPostData = {
        user_id: user.id,
        post_type: postType,
        selected_networks: selectedNetworks,
        caption,
        linkedin_body: params.networkCaptions?.linkedin || null,
        scheduled_date: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        schedule_asap: scheduleAsap,
        status: initialStatus,
        origin_mode: 'manual',
        tema: caption.substring(0, 50) || 'Manual post',
        template_a_images: ['placeholder-pending-upload'],
        template_b_images: [] as string[],
        workflow_id: publishSessionId,
        media_urls_backup: JSON.parse(JSON.stringify([])),
        recovered_from_post_id: params.recoveredFromPostId || null,
        publish_metadata: JSON.parse(JSON.stringify({
          published_via: 'manual_create_getlate',
          formats: consolidatedFormats,
          started_at: new Date().toISOString(),
          recovered_from: params.recoveredFromPostId || null,
        })),
      };
      
      console.log('[usePublishWithProgress] Creating post record BEFORE upload...');
      
      const { data: createdPost, error: createPostError } = await supabase
        .from('posts')
        .insert([initialPostData])
        .select('id')
        .single();
      
      if (createPostError) {
        console.error('[usePublishWithProgress] Failed to create post record:', createPostError);
      } else {
        createdPostId = createdPost.id;
        console.log(`[usePublishWithProgress] Post record created with ID: ${createdPostId}`);
      }

      // Check if any Instagram format is selected
      const hasInstagramFormat = consolidatedFormats.some(
        format => (FORMAT_TO_NETWORK[format] || 'instagram') === 'instagram'
      );
      
      // Process media for Instagram (add margins if needed)
      let processedFiles = mediaFiles;
      if (hasInstagramFormat) {
        updatePhase1('uploading', 5, 'A otimizar imagens para Instagram...');
        const { files: optimizedFiles, resizedCount } = await processMediaForInstagram(
          mediaFiles,
          true,
          (current, total, message) => {
            const optimizationProgress = Math.round((current / total) * 15);
            updatePhase1('uploading', 5 + optimizationProgress, message);
          }
        );
        processedFiles = optimizedFiles;
        if (resizedCount > 0) {
          console.log(`[usePublishWithProgress] [${publishSessionId}] Resized ${resizedCount} images for Instagram`);
        }
      }
      
      const mediaUrls: string[] = [];
      const originalMediaUrls: string[] = []; // Backup for recovery
      const totalFiles = processedFiles.length;
      
      // Determine bucket and path based on content type
      const storageBucket = 'publications';
      const timestamp = Date.now();
      
      for (let i = 0; i < totalFiles; i++) {
        if (shouldCancel) {
          updatePhase1('error', Math.round((i / totalFiles) * 80), 'Cancelado', 'Publicação cancelada');
          await markPostFailed('Publicação cancelada pelo utilizador');
          setIsPublishing(false);
          publishingLockRef.current = false;
          return false;
        }
        
        const file = processedFiles[i];
        const fileType = file.type.startsWith('video/') ? 'videos' : 'images';
        const safeName = sanitizeFileName(file.name);
        const fileName = `${user.id}/${fileType}/${timestamp}-${i}-${safeName}`;
        const fallbackFileName = `${user.id}/${timestamp}-${safeName}`;
        const uploadProgress = 20 + Math.round(((i + 0.5) / totalFiles) * 60);
        
        updatePhase1('uploading', uploadProgress, `A enviar ficheiro ${i + 1} de ${totalFiles}...`);
        
        // Try publications bucket first, fallback to pdfs if it fails
        let uploadError = null;
        let usedBucket = storageBucket;
        
        const uploadResult = await supabase.storage
          .from(storageBucket)
          .upload(fileName, file);
        
        if (uploadResult.error) {
          // Fallback to pdfs bucket if publications doesn't exist or fails
          console.log(`[usePublishWithProgress] publications bucket failed, trying pdfs bucket...`);
          usedBucket = 'pdfs';
          const fallbackResult = await supabase.storage
            .from('pdfs')
            .upload(fallbackFileName, file);
          
          if (fallbackResult.error) {
            uploadError = fallbackResult.error;
          }
        }
        
        if (uploadError) {
          const diagnosis = diagnoseUploadError(file, uploadError, safeName);
          const structuredErrorLog = JSON.stringify({
            tipo: 'upload_error',
            causa: diagnosis.causa,
            detalhe: diagnosis.detalhe,
            sugestao: diagnosis.sugestao,
            nome_original: file.name,
            nome_sanitizado: safeName,
            tamanho_mb: (file.size / (1024 * 1024)).toFixed(1),
            tipo_ficheiro: file.type,
            mensagem_tecnica: uploadError.message,
            ficheiro_index: i + 1,
            total_ficheiros: totalFiles,
          });
          updatePhase1('error', uploadProgress, diagnosis.causa, diagnosis.detalhe);
          await markPostFailed(structuredErrorLog);
          toast.error(`Upload falhou: ${diagnosis.causa}`, {
            description: `${diagnosis.detalhe} — 💡 ${diagnosis.sugestao}`,
            duration: 15000,
          });
          setIsPublishing(false);
          publishingLockRef.current = false;
          return false;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from(usedBucket)
          .getPublicUrl(usedBucket === storageBucket ? fileName : fallbackFileName);
        
        mediaUrls.push(publicUrl);
        originalMediaUrls.push(publicUrl);
        updatePhase1('uploading', 20 + Math.round(((i + 1) / totalFiles) * 60), `Ficheiro ${i + 1} de ${totalFiles} enviado`);
      }
      
      // Update post record with actual media URLs
      if (createdPostId && mediaUrls.length > 0) {
        await supabase.from('posts').update({
          template_a_images: mediaUrls,
          media_urls_backup: JSON.parse(JSON.stringify(originalMediaUrls)),
        }).eq('id', createdPostId);
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
      
      // Create scheduled_job for tracking if this is a scheduled post
      if (isScheduledForLater && scheduledDate && createdPostId) {
        const { error: jobError } = await supabase.from('scheduled_jobs').insert({
          post_id: createdPostId,
          job_type: 'post',
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending',
          created_by: user.id,
          payload: {
            post_id: createdPostId,
            formats: consolidatedFormats,
            caption,
            media_urls: mediaUrls,
          },
        });
        
        if (jobError) {
          console.warn('[usePublishWithProgress] Failed to create scheduled_job:', jobError);
        } else {
          console.log(`[usePublishWithProgress] Scheduled job created for post ${createdPostId}`);
        }
      }
      
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
      
      // Track publishing start time for timeout warnings
      const publishingStartTime = Date.now();
      const LONG_PUBLISH_WARNING_MS = 60000; // 60 seconds
      
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
        
        // Check if publishing is taking too long and show warning
        const elapsedTime = Date.now() - publishingStartTime;
        if (elapsedTime > LONG_PUBLISH_WARNING_MS) {
          updatePhase2('publishing', Math.round((i / sortedFormats.length) * 100), 
            'A aguardar resposta da API (pode demorar para vídeos grandes)...');
        }
        
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
              
              // Generate semantic PDF filename from caption
              const semanticFilename = generateSemanticPdfFilename(caption);
              const pdfFileName = `${user.id}/${semanticFilename}`;
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
        // NOTE: publication_attempts are now recorded ONLY in the edge function to avoid duplicates
        const idempotencyKey = `${publishSessionId}_${format}_${network}`;
        console.log(`[usePublishWithProgress] [${publishSessionId}] Publishing ${format} to ${network} with key: ${idempotencyKey}`);
        
        try {
          // Use network-specific caption if available, truncated to network limit
          const maxCaptionLen = NETWORK_CONSTRAINTS[network]?.max_caption_length || 2200;
          const networkCaption = (params.networkCaptions?.[network] || caption).slice(0, maxCaptionLen);
          
          const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-to-getlate', {
            body: {
              format,
              caption: networkCaption,
              media_urls: finalMediaUrls,
              scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : undefined,
              scheduled_time: time || undefined,
              publish_immediately: scheduleAsap || !scheduledDate,
              idempotency_key: idempotencyKey,
              post_id: createdPostId, // Pass post_id for tracking in publication_attempts
            },
          });
          
          if (publishError) {
            // Extract detailed error from publishError.context when available (HTTP 500 responses)
            const errorContext = publishError.context as { status?: number; body?: string } | undefined;
            const httpStatus = errorContext?.status || 0;
            
            console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} failed:`, {
              message: publishError.message,
              status: httpStatus,
              body: errorContext?.body?.substring(0, 500),
            });
            
            let detailedErrorMessage = 'Erro de comunicação';
            let structuredError: StructuredError | null = null;
            
            // Try to extract structured error from context body
            if (errorContext?.body) {
              try {
                const bodyParsed = JSON.parse(errorContext.body);
                
                // Handle structured error object: { error: { message, code, source } }
                if (bodyParsed.error && typeof bodyParsed.error === 'object') {
                  structuredError = parseStructuredError(bodyParsed.error);
                  detailedErrorMessage = structuredError?.message || bodyParsed.error?.message || detailedErrorMessage;
                }
                // Handle error as string from Getlate API: { error: "message" }
                else if (bodyParsed.error && typeof bodyParsed.error === 'string') {
                  structuredError = classifyErrorFromString(bodyParsed.error, httpStatus);
                  detailedErrorMessage = structuredError.message;
                }
                // Handle message field: { message: "..." }
                else if (bodyParsed.message && typeof bodyParsed.message === 'string') {
                  structuredError = classifyErrorFromString(bodyParsed.message, httpStatus);
                  detailedErrorMessage = structuredError.message;
                }
                // Handle success: false with details
                else if (bodyParsed.details && typeof bodyParsed.details === 'string') {
                  structuredError = classifyErrorFromString(bodyParsed.details, httpStatus);
                  detailedErrorMessage = structuredError.message;
                }
                
                console.log(`[usePublishWithProgress] [${publishSessionId}] Parsed error:`, {
                  detailedErrorMessage,
                  code: structuredError?.code,
                  source: structuredError?.source,
                });
              } catch (parseErr) {
                // Body is not JSON - use raw message
                structuredError = classifyErrorFromString(errorContext.body, httpStatus);
                detailedErrorMessage = structuredError.message;
                console.warn(`[usePublishWithProgress] [${publishSessionId}] Raw error body:`, errorContext.body.substring(0, 200));
              }
            }
            
            // Fallback: use publishError.message with classifyErrorFromString
            if (!structuredError && publishError.message) {
              structuredError = classifyErrorFromString(publishError.message, httpStatus);
              detailedErrorMessage = structuredError.message;
            }
            
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: 'error', 
              errorMessage: detailedErrorMessage,
              structuredError: structuredError || undefined,
            });
            updatePlatformStatus(format, 'error', detailedErrorMessage, undefined, structuredError || undefined);
          } else if (!publishResult?.success) {
            console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} returned failure:`, publishResult?.error);
            
            // Check if error is a structured error object from edge function
            let detailedError = 'Falha na publicação';
            let structuredError: StructuredError | null = null;
            
            if (publishResult?.error && typeof publishResult.error === 'object') {
              // New structured error format from edge function
              structuredError = parseStructuredError(publishResult.error);
              detailedError = structuredError?.message || 'Falha na publicação';
            } else if (publishResult?.error && typeof publishResult.error === 'string') {
              detailedError = publishResult.error;
              // Try to parse if it's a JSON string
              try {
                const parsed = JSON.parse(publishResult.error);
                if (parsed.message) detailedError = parsed.message;
                if (parsed.code) {
                  structuredError = parseStructuredError(parsed);
                }
              } catch {
                // Use original error if not JSON
              }
            } else if (publishResult?.details) {
              detailedError = publishResult.details;
            }
            
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: 'error', 
              errorMessage: detailedError,
              structuredError: structuredError || undefined,
            });
            updatePlatformStatus(format, 'error', detailedError, undefined, structuredError || undefined);
          } else {
            const isPending = publishResult?.pending === true;
            console.log(`[usePublishWithProgress] [${publishSessionId}] ✅ ${format} ${isPending ? 'accepted (pending)' : 'published successfully'}`);
            platformResults.set(format, { 
              ...platformResults.get(format)!, 
              status: isPending ? 'pending' : 'success',
              postUrl: publishResult?.postUrl || publishResult?.url 
            });
            updatePlatformStatus(format, isPending ? 'processing' : 'success', 
              isPending ? 'Em processamento pelo Getlate...' : undefined, 
              publishResult?.postUrl || publishResult?.url);
            
            // NOTE: publication_attempts are now managed exclusively by the edge function
            // No frontend writes to avoid race conditions and duplicate records
          }
        } catch (err) {
          console.error(`[usePublishWithProgress] [${publishSessionId}] ${format} exception:`, err);
          
          // Create structured error from exception with full context
          const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
          const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                                 errorMessage.toLowerCase().includes('fetch') ||
                                 errorMessage.toLowerCase().includes('timeout') ||
                                 errorMessage.toLowerCase().includes('abort');
          
          const structuredError: StructuredError = {
            message: isNetworkError ? 'Erro de ligação à rede' : 'Erro inesperado no processamento',
            code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN',
            source: 'internal',
            isRetryable: true,
            originalError: errorMessage,
            suggestedAction: isNetworkError 
              ? 'Verifica a tua ligação à internet e tenta novamente'
              : 'Recarrega a página e tenta novamente. Se persistir, contacta o suporte.',
          };
          
          platformResults.set(format, { 
            ...platformResults.get(format)!, 
            status: 'error', 
            errorMessage: structuredError.message,
            structuredError,
          });
          updatePlatformStatus(format, 'error', structuredError.message, undefined, structuredError);
          
          // NOTE: publication_attempts are now managed exclusively by the edge function
          // Frontend exceptions (network errors, timeouts) are tracked via platformResults only
        }
      }
      
      // ═══════════════════════════════════════════
      // POST-PUBLISH VERIFICATION: Progressive polling if any platform shows error/pending
      // The edge function may have succeeded in the background even if the
      // HTTP response timed out or returned a transient error.
      // Also handles "pending" (Getlate accepted but processing internally).
      // ═══════════════════════════════════════════
      const needsVerification = Array.from(platformResults.values()).filter(
        p => p.status === 'error' || p.status === 'pending'
      );
      
      if (createdPostId && needsVerification.length > 0) {
        const MAX_VERIFY_TIME = 90_000; // 90 seconds
        const POLL_INTERVAL = 5_000;    // 5 seconds
        const verifyStart = Date.now();
        
        console.log(`[usePublishWithProgress] [${publishSessionId}] ⏳ ${needsVerification.length} platform(s) need verification — polling DB for up to 90s...`);
        updatePhase2('publishing', 95, 'A verificar estado real da publicação...');
        
        let verified = false;
        
        while (Date.now() - verifyStart < MAX_VERIFY_TIME) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          
          try {
            const { data: dbPost } = await supabase
              .from('posts')
              .select('status, external_post_ids, published_at')
              .eq('id', createdPostId)
              .single();
            
            const elapsed = Math.round((Date.now() - verifyStart) / 1000);
            console.log(`[usePublishWithProgress] [${publishSessionId}] DB poll (${elapsed}s):`, {
              status: dbPost?.status,
              external_post_ids: dbPost?.external_post_ids,
            });
            
            if (dbPost && (dbPost.status === 'published' || (dbPost.external_post_ids && Object.keys(dbPost.external_post_ids as Record<string, string>).length > 0))) {
              const externalIds = (dbPost.external_post_ids || {}) as Record<string, string>;
              let anyCorrected = false;
              
              for (const [format, result] of platformResults) {
                if (result.status === 'error' || result.status === 'pending') {
                  const network = FORMAT_TO_NETWORK[format] || 'instagram';
                  const externalUrl = externalIds[network] || externalIds['getlate'];
                  
                  if (externalUrl || dbPost.status === 'published') {
                    console.log(`[usePublishWithProgress] [${publishSessionId}] ✅ DB confirms ${format} was actually published! Correcting result.`);
                    platformResults.set(format, { 
                      ...result, 
                      status: 'success', 
                      postUrl: externalUrl || undefined,
                      errorMessage: undefined,
                      structuredError: undefined,
                    });
                    updatePlatformStatus(format, 'success', undefined, externalUrl || undefined);
                    anyCorrected = true;
                  }
                }
              }
              
              // Clean up stale error_log when DB confirms success — prevents
              // /publication-history from showing red badges on successful posts.
              if (anyCorrected && dbPost.status === 'published') {
                try {
                  await supabase
                    .from('posts')
                    .update({ error_log: null, failed_at: null })
                    .eq('id', createdPostId);
                  console.log(`[usePublishWithProgress] [${publishSessionId}] 🧹 Cleared stale error_log after success confirmation.`);
                } catch (cleanupErr) {
                  console.warn(`[usePublishWithProgress] [${publishSessionId}] Could not clear error_log:`, cleanupErr);
                }
              }
              
              verified = true;
              break;
            }
            
            updatePhase2('publishing', 95, `A verificar publicação... (${elapsed}s)`);
          } catch (pollErr) {
            console.warn(`[usePublishWithProgress] [${publishSessionId}] Poll error:`, pollErr);
          }
        }
        
        if (!verified) {
          // Check DB one final time to determine if still processing or truly failed
          try {
            const { data: finalCheck } = await supabase
              .from('posts')
              .select('status')
              .eq('id', createdPostId!)
              .single();
            
            if (finalCheck?.status === 'publishing') {
              // Still processing - show informative toast instead of error
              toast.info('A publicação pode ainda estar a ser processada. Verifique o histórico em alguns minutos.', { duration: 10000 });
            }
          } catch (e) {
            console.warn(`[usePublishWithProgress] [${publishSessionId}] Final check error:`, e);
          }
          
          // After 90s, treat remaining "pending" as success (Getlate accepted it)
          for (const [format, result] of platformResults) {
            if (result.status === 'pending') {
              console.log(`[usePublishWithProgress] [${publishSessionId}] ⏰ Timeout: treating ${format} pending as accepted`);
              platformResults.set(format, { 
                ...result, 
                status: 'success',
                errorMessage: undefined,
              });
              updatePlatformStatus(format, 'success');
            }
          }
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
      
      // Update the post record with final status
      const hasSuccess = successfulFormats.length > 0;
      const hasFailed = failedFormats.length > 0;
      
      // Determine final status - consider if this was a scheduled post
      const isScheduledPost = !scheduleAsap && scheduledDate && scheduledDate > new Date();
      let finalStatus = isScheduledPost ? 'scheduled' : 'published';
      if (!hasSuccess && hasFailed) {
        finalStatus = 'failed';
      } else if (hasSuccess && hasFailed) {
        finalStatus = isScheduledPost ? 'scheduled' : 'published'; // Partial success
      }
      
      // Show specific toast for scheduled posts
      if (finalStatus === 'scheduled' && hasSuccess) {
        const formattedDate = scheduledDate ? 
          `${scheduledDate.toLocaleDateString('pt-PT')} às ${scheduledDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 
          '';
        toast.success(`📅 Publicação agendada para ${formattedDate}`, { duration: 5000 });
      }
      
      // ═══════════════════════════════════════════
      // REGISTER MEDIA IN LIBRARY AFTER SUCCESSFUL PUBLICATION
      // ═══════════════════════════════════════════
      if (hasSuccess && user?.id && mediaUrls.length > 0) {
        console.log(`[usePublishWithProgress] Registering ${mediaUrls.length} media files in library...`);
        
        try {
          const mediaEntries = mediaUrls.map((url, index) => {
            const fileName = url.split('/').pop() || `media-${index}`;
            const originalFile = processedFiles[index];
            const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || 
                           (originalFile && originalFile.type.startsWith('video/'));
            
            return {
              user_id: user.id,
              file_name: fileName,
              file_url: url,
              file_type: isVideo ? 'video' : 'image',
              file_size: originalFile?.size || null,
              source: 'publication',
              is_favorite: false,
            };
          });
          
          const { error: mediaError } = await supabase
            .from('media_library')
            .insert(mediaEntries);
            
          if (mediaError) {
            console.error('[usePublishWithProgress] Failed to register media in library:', mediaError);
            toast.warning('Média publicada mas não registada na biblioteca', {
              description: mediaError.message,
            });
          } else {
            console.log(`[usePublishWithProgress] ✅ Registered ${mediaEntries.length} files in media library`);
            toast.success(`${mediaEntries.length} ficheiro(s) adicionado(s) à biblioteca`);
          }
        } catch (mediaLibError) {
          console.error('[usePublishWithProgress] Media library registration error:', mediaLibError);
        }
      }
      
      if (createdPostId) {
        // Update existing post record
        // Build error_log for partial or total failures
        const errorLogText = hasFailed 
          ? failedFormats.map(f => `${f.format}: ${f.errorMessage || 'Erro desconhecido'}`).join('; ')
          : null;
        
        const updateData: Record<string, any> = {
          status: finalStatus,
          published_at: hasSuccess ? new Date().toISOString() : null,
          failed_at: hasFailed && !hasSuccess ? new Date().toISOString() : null,
          error_log: errorLogText,
          publish_metadata: JSON.parse(JSON.stringify({
            published_via: 'manual_create_getlate',
            formats: consolidatedFormats,
            pdf_generated: !!pdfUrl,
            successCount: successfulFormats.length,
            failedCount: failedFormats.length,
            completed_at: new Date().toISOString(),
          })),
        };
        
        console.log(`[usePublishWithProgress] Updating post ${createdPostId} with final status: ${finalStatus}`);
        
        try {
          const { error: updateError } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', createdPostId);
            
          if (updateError) {
            console.error('[usePublishWithProgress] DB update error:', updateError.message);
          } else {
            console.log('[usePublishWithProgress] Post updated successfully');
            
            // Clear calendar cache to force refresh
            try {
              localStorage.removeItem('calendar_events_cache');
              localStorage.removeItem('calendar_last_updated');
              console.log('[usePublishWithProgress] Calendar cache cleared');
            } catch (cacheError) {
              console.warn('[usePublishWithProgress] Failed to clear calendar cache:', cacheError);
            }
          }
        } catch (updateError) {
          console.error('[usePublishWithProgress] DB update exception:', updateError);
        }
      }
      
      // Release lock
      publishingLockRef.current = false;
      setIsPublishing(false);
      console.log(`[usePublishWithProgress] 🔓 Lock released for session: ${publishSessionId}`);
      return successfulFormats.length > 0;
      
    } catch (error) {
      console.error('[usePublishWithProgress] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro inesperado';
      updatePhase1('error', 0, 'Erro', errorMsg);
      await markPostFailed(errorMsg);
      toast.error(`Erro na publicação: ${errorMsg}`, { duration: 15000 });
      // Release lock on error
      publishingLockRef.current = false;
      setIsPublishing(false);
      console.log(`[usePublishWithProgress] 🔓 Lock released due to error`);
      return false;
    }
  }, [shouldCancel, updatePhase1, updatePhase2, updatePlatformStatus]);
  
  // Reset progress
  const resetProgress = useCallback(() => {
    setProgress(initialProgress);
    publishingLockRef.current = false;
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
