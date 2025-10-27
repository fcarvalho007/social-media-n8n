import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { CarouselPreview } from '@/components/CarouselPreview';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ActionBar } from '@/components/ActionBar';
import { TargetSelector } from '@/components/publishing/TargetSelector';
import { PlatformRules } from '@/components/publishing/PlatformRules';
import { PublishModal } from '@/components/publishing/PublishModal';
import { PublishDebugPanel } from '@/components/publishing/PublishDebugPanel';
import { FinalReviewModal } from '@/components/publishing/FinalReviewModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2, ArrowLeft, CheckCircle2, Eye, LayoutGrid, Linkedin, Instagram, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PublishTarget, PostType, PublishProgress } from '@/types/publishing';
import { validateAllTargets } from '@/lib/publishingValidation';
import { generateCarouselPDF } from '@/lib/pdfGenerator';

const Review = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B' | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [templateAImages, setTemplateAImages] = useState<string[]>([]);
  const [templateBImages, setTemplateBImages] = useState<string[]>([]);
  const [archivedSlidesA, setArchivedSlidesA] = useState<string[]>([]);
  const [archivedSlidesB, setArchivedSlidesB] = useState<string[]>([]);
  const [linkedinBody, setLinkedinBody] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [useDifferentCaptions, setUseDifferentCaptions] = useState(false);
  const [instagramCaption, setInstagramCaption] = useState('');
  const templatesRef = useRef<HTMLDivElement>(null);
  
  // Publishing state
  const [publishTargets, setPublishTargets] = useState<Record<PublishTarget, boolean>>({
    instagram: false,
    linkedin: false,
  });
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishProgress, setPublishProgress] = useState<Record<PublishTarget, PublishProgress>>({
    instagram: { platform: 'instagram', status: 'pending', progress: 0 },
    linkedin: { platform: 'linkedin', status: 'pending', progress: 0 },
  });
  const [validations, setValidations] = useState<Record<string, any>>({});
  const [generatedPdf, setGeneratedPdf] = useState<{ filename: string; sizeMB: number; pages: number } | null>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [pendingPublishData, setPendingPublishData] = useState<{
    scheduledDate?: Date;
    retryPlatform?: PublishTarget;
    pdfUrl: string | null;
    pdfBlob?: Blob;
    pdfBase64?: string;
    pdfMetadata: { sizeMB: number; pages: number } | null;
    pdfSource?: string;
    selectedImages: string[];
  } | null>(null);

  useEffect(() => {
    fetchPost();
  }, [id]);

  // Validate when targets or caption changes
  useEffect(() => {
    if (post && caption) {
      const postType: PostType = 'carousel'; // Always carousel for IA posts
      const selectedImages = selectedTemplate === 'A' ? templateAImages : templateBImages;
      
      const validationResults = validateAllTargets(
        publishTargets,
        postType,
        {
          caption,
          body: caption,
          hashtags,
          mediaCount: selectedImages.length,
        }
      );
      
      setValidations(validationResults);
    }
  }, [publishTargets, caption, hashtags, selectedTemplate, templateAImages, templateBImages, post]);

  const fetchPost = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Publicação não encontrada');
        navigate('/');
        return;
      }
      
      setPost(data);
      setCaption(data.caption_edited || data.caption);
      setHashtags(data.hashtags_edited || data.hashtags || []);
      setSelectedTemplate(data.selected_template as 'A' | 'B' | null);
      setNotes(data.notes || '');
      setTemplateAImages(data.template_a_images || []);
      setTemplateBImages(data.template_b_images || []);
      
      // Check if we have different captions for each platform
      const hasLinkedinBody = data.linkedin_body && data.linkedin_body !== data.caption;
      setUseDifferentCaptions(hasLinkedinBody);
      setLinkedinBody(data.linkedin_body || data.caption || '');
      setInstagramCaption(data.caption || '');
      
      // Load archived slides from metadata
      const metadataA = data.template_a_metadata as any;
      const metadataB = data.template_b_metadata as any;
      setArchivedSlidesA(metadataA?.archived_slides || []);
      setArchivedSlidesB(metadataB?.archived_slides || []);
      
      // Load saved targets or default to last used
      if (data.publish_targets) {
        setPublishTargets(data.publish_targets as Record<PublishTarget, boolean>);
      }
    } catch (error) {
      console.error('Erro ao carregar publicação:', error);
      toast.error('Falha ao carregar publicação');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          caption_edited: caption,
          hashtags_edited: hashtags,
          notes,
          selected_template: selectedTemplate,
          publish_targets: publishTargets,
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Alterações guardadas com sucesso');
    } catch (error) {
      console.error('Erro ao guardar:', error);
      toast.error('Falha ao guardar alterações');
      throw error;
    }
  };

  const handleApprove = async (scheduledDate?: Date) => {
    if (!selectedTemplate) {
      toast.error('Por favor, selecione primeiro um modelo');
      return;
    }

    // Check if at least one target is selected
    const hasTargets = Object.values(publishTargets).some(t => t);
    if (!hasTargets) {
      toast.error('Selecione pelo menos uma plataforma para publicar');
      return;
    }

    // Validate all targets
    const allValid = Object.entries(validations).every(([_, v]) => v.valid);
    if (!allValid) {
      toast.error('Corrija os erros de validação antes de publicar');
      return;
    }

    try {
      // Save to database first
      const isValidUUID = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      const updateData: any = {
        status: 'approved',
        selected_template: selectedTemplate,
        caption_edited: caption,
        hashtags_edited: hashtags,
        notes,
        reviewed_at: new Date().toISOString(),
        publish_targets: publishTargets,
      };

      if (isValidUUID) {
        updateData.reviewed_by = user.id;
      }

      if (scheduledDate) {
        updateData.scheduled_date = scheduledDate.toISOString();
      }

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // If not scheduled, publish immediately
      if (!scheduledDate) {
        setPublishModalOpen(true);
        await handlePublishToTargets(scheduledDate);
      } else {
        toast.success('Publicação agendada com sucesso!');
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Falha ao aprovar publicação');
      throw error;
    }
  };

  const handlePublishToTargets = async (scheduledDate?: Date, retryPlatform?: PublishTarget) => {
    let activeTargets = Object.entries(publishTargets)
      .filter(([_, active]) => active)
      .map(([target]) => target as PublishTarget);

    // If retrying a specific platform, only publish that one
    if (retryPlatform) {
      activeTargets = [retryPlatform];
    }

    // Check idempotency - skip already published platforms (unless retrying)
    const targetsToPublish = activeTargets.filter(target => {
      if (!retryPlatform && post.external_post_ids?.[target]) {
        toast.info(`Já publicado em ${target === 'instagram' ? 'Instagram' : 'LinkedIn'}`);
        return false;
      }
      return true;
    });

    if (targetsToPublish.length === 0) {
      toast.info('Todas as plataformas selecionadas já foram publicadas');
      return;
    }

    const selectedImages = selectedTemplate === 'A' ? templateAImages : templateBImages;
    const successTracker: Record<PublishTarget, boolean> = { instagram: false, linkedin: false };

    // Generate PDF only if LinkedIn is selected
    let pdfBlob: Blob | null = null;
    let pdfUrl: string | null = null;
    let pdfMetadata: { sizeMB: number; pages: number } | null = null;
    const needsPdf = targetsToPublish.includes('linkedin');

    try {
      // Initialize progress
      targetsToPublish.forEach(target => {
        setPublishProgress(prev => ({
          ...prev,
          [target]: { 
            ...prev[target], 
            status: 'validating', 
            progress: 10, 
            message: target === 'linkedin' && needsPdf ? 'A gerar PDF do carrossel...' : 'A preparar conteúdo...',
            startedAt: new Date().toISOString(),
          }
        }));
      });

      if (needsPdf) {
        console.info('[PDF] Starting client-side PDF with proxy', { imageCount: selectedImages.length, timestamp: new Date().toISOString() });
        setPublishProgress(prev => ({
          ...prev,
          linkedin: { ...prev.linkedin, progress: 15, message: 'A validar imagens...' }
        }));
        
        try {
          // Step 1: Fetch images as base64 via proxy
          console.log('[PDF] FETCH: Calling fetch-images-b64 proxy');
          const fetchStart = Date.now();
          const { data: fetchData, error: fetchError } = await supabase.functions.invoke('fetch-images-b64', {
            body: { urls: selectedImages },
          });
          const fetchElapsed = Date.now() - fetchStart;
          
          if (fetchError) {
            console.error('[PDF] FETCH: Invoke error', { error: fetchError, elapsed: fetchElapsed });
            throw new Error(`Erro ao validar imagens: ${fetchError.message}`);
          }
          
          if (!fetchData?.ok) {
            const stage = fetchData?.stage || 'unknown';
            const code = fetchData?.code || 'unknown';
            const msg = fetchData?.message || 'Fetch failed';
            const details = fetchData?.details || [];
            console.error('[PDF] FETCH: Failed', { stage, code, msg, details, elapsed: fetchElapsed });
            
            let errorMsg = `Erro na etapa: ${stage} (${code})\n${msg}`;
            if (details.length > 0) {
              const detailsStr = details.map((d: any) => `Slide ${d.index + 1}: ${d.reason}`).join(', ');
              errorMsg += `\nDetalhes: ${detailsStr}`;
            }
            throw new Error(errorMsg);
          }
          
          const items = fetchData.items as Array<{ index: number; url: string; mime: string; base64: string }>;
          console.log('[PDF] FETCH: OK', { count: items.length, elapsed: fetchElapsed });
          
          setPublishProgress(prev => ({
            ...prev,
            linkedin: { ...prev.linkedin, progress: 30, message: 'A gerar PDF localmente...' }
          }));
          
          // Step 2: Build data URLs
          const dataUrls = items.map(item => `data:${item.mime};base64,${item.base64}`);
          
          // Step 3: Generate PDF locally (for preview/download only)
          console.log('[PDF] COMPOSE: Generating PDF with', dataUrls.length, 'images');
          const composeStart = Date.now();
          const blob = await generateCarouselPDF({ images: dataUrls, title: post.tema });
          const composeElapsed = Date.now() - composeStart;
          const sizeMB = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
          const pages = dataUrls.length;
          
          console.log('[PDF] COMPOSE: OK', { pages, sizeMB, elapsed: composeElapsed });
          
          // Create blob URL for local preview/download
          const blobUrl = URL.createObjectURL(blob);
          
          setPublishProgress(prev => ({
            ...prev,
            linkedin: { ...prev.linkedin, progress: 60, message: 'PDF pronto para revisão' }
          }));
          
          toast.success('PDF gerado com sucesso');
          
          // Show Final Review with PDF blob for later conversion to base64
          setPendingPublishData({
            scheduledDate,
            retryPlatform,
            pdfUrl: blobUrl, // For local preview only
            pdfBlob: blob, // Store blob for base64 conversion
            pdfMetadata: { pages, sizeMB },
            pdfSource: 'client',
            selectedImages,
          });
          setShowFinalReview(true);
          return;

        } catch (pdfError: any) {
          console.error('[PDF] Generation failed', { 
            error: pdfError, 
            message: pdfError?.message,
            postId: id,
            timestamp: new Date().toISOString() 
          });
          
          const errorMsg = pdfError?.message || 'Erro ao gerar PDF';
          toast.error(errorMsg);
          
          setPublishProgress(prev => ({
            ...prev,
            linkedin: { 
              ...prev.linkedin, 
              status: 'error', 
              error: errorMsg,
              message: errorMsg,
              technicalDetails: { error: pdfError, postId: id, timestamp: new Date().toISOString() },
            }
          }));
          return;
        }
      }

      // Continue to actual publishing
      await executePublish(targetsToPublish, selectedImages, scheduledDate, pdfUrl, pdfMetadata, successTracker);

    } catch (error) {
      console.error('Error in publishing flow:', error);
      toast.error('Erro ao processar publicação');
      
      // Set error state for all targets
      targetsToPublish.forEach(target => {
        setPublishProgress(prev => ({
          ...prev,
          [target]: {
            ...prev[target],
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          }
        }));
      });
    }
  };

  const executePublish = async (
    targetsToPublish: PublishTarget[],
    selectedImages: string[],
    scheduledDate: Date | undefined,
    pdfUrl: string | null,
    pdfMetadata: { sizeMB: number; pages: number } | null,
    successTracker: Record<PublishTarget, boolean>,
    pdfBase64?: string
  ) => {
    try {
      // Publish to each platform with retry logic
      for (const target of targetsToPublish) {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: Error | null = null;
        let lastProgressUpdate = Date.now();

        // Heartbeat timer to show "Working..." if no progress for 5s
        const heartbeatInterval = setInterval(() => {
          const timeSinceUpdate = Date.now() - lastProgressUpdate;
          if (timeSinceUpdate > 5000) {
            setPublishProgress(prev => ({
              ...prev,
              [target]: { 
                ...prev[target], 
                message: `${prev[target].message} (a processar...)` 
              }
            }));
          }
        }, 5000);

        while (attempts < maxAttempts) {
          try {
            console.info(`[PUBLISH:${target}] Attempt ${attempts + 1}/${maxAttempts}`, { timestamp: new Date().toISOString() });
            
            const delay = attempts > 0 ? Math.pow(2, attempts) * 1000 : 0;
            if (delay > 0) {
              setPublishProgress(prev => ({
                ...prev,
                [target]: { 
                  ...prev[target], 
                  status: 'uploading', 
                  progress: 40, 
                  message: `A tentar novamente... (tentativa ${attempts + 1}/${maxAttempts})` 
                }
              }));
              lastProgressUpdate = Date.now();
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Progress: 40% -> 60% preparing payload
            setPublishProgress(prev => ({
              ...prev,
              [target]: { ...prev[target], status: 'uploading', progress: 50, message: 'A preparar payload...' }
            }));
            lastProgressUpdate = Date.now();

            // Build platform-specific payload
            const basePayload = {
              postId: id,
              platform: target,
              postType: 'carousel' as const,
              hashtags,
              scheduleAt: scheduledDate?.toISOString(),
            };

            let payload: any;
            if (target === 'instagram') {
              // Instagram: send native images
              payload = {
                ...basePayload,
                caption,
                images: selectedImages,
              };
              } else if (target === 'linkedin') {
                const pageAlts = selectedImages.map((imgUrl, idx) => {
                  const imgKey = imgUrl.split('/').pop() || `image_${idx}`;
                  return post.alt_texts?.[imgKey] || `Slide ${idx + 1}/${selectedImages.length}`;
                });

                // LinkedIn: send PDF as base64
                payload = {
                  ...basePayload,
                  body: caption,
                  pageAlts,
                  pdfMetadata,
                  pdfBase64, // Send PDF as base64 instead of images
                };
              }

            console.info(`[PUBLISH:${target}] Sending to API`, { payloadKeys: Object.keys(payload) });

            // Progress: 60% uploading to API
            setPublishProgress(prev => ({
              ...prev,
              [target]: { ...prev[target], progress: 60, message: 'A enviar para a API...' }
            }));
            lastProgressUpdate = Date.now();

            const { data, error } = await supabase.functions.invoke('publish-to-getlate', {
              body: payload,
            });

            console.info(`[PUBLISH:${target}] API response received`, { 
              success: !error, 
              data,
              timestamp: new Date().toISOString() 
            });

            // Prefer structured response shape
            if (data?.ok === false) {
              if (data.code === 409) {
                console.info(`[PUBLISH:${target}] Already published (idempotency conflict)`);
                toast.info(`Já publicado em ${target === 'instagram' ? 'Instagram' : 'LinkedIn'}`);
                setPublishProgress(prev => ({
                  ...prev,
                  [target]: {
                    ...prev[target],
                    status: 'done',
                    progress: 100,
                    message: 'Já publicado anteriormente',
                  }
                }));
                successTracker[target] = true;
                clearInterval(heartbeatInterval);
                break;
              }
              const stage = data.stage || 'unknown';
              const code = data.code;
              const message = data.message || 'Falha ao publicar';
              const errorDetails = {
                stage,
                code,
                message,
                postId: id,
                platform: target,
                meta: data.meta || {},
                details: data.details || [],
                timestamp: new Date().toISOString(),
              };
              
              setPublishProgress(prev => ({
                ...prev,
                [target]: {
                  ...prev[target],
                  status: 'error',
                  progress: 0,
                  error: message,
                  message: `Erro na etapa: ${stage} (${code ?? 'unknown'})`,
                  technicalDetails: errorDetails,
                }
              }));
              throw new Error(message);
            }

            if (error) {
              const errorDetails = {
                stage: 'network',
                code: 'invoke-error',
                message: error.message || 'Erro desconhecido',
                postId: id,
                platform: target,
                payload: { ...payload, pdfBase64: payload.pdfBase64 ? '[BASE64_OMITTED]' : undefined },
                timestamp: new Date().toISOString(),
              };
              
              setPublishProgress(prev => ({
                ...prev,
                [target]: {
                  ...prev[target],
                  status: 'error',
                  progress: 0,
                  error: error.message || 'Erro desconhecido',
                  message: `Erro na etapa: network (invoke-error)`,
                  technicalDetails: errorDetails,
                }
              }));
              throw error;
            }

            const okSuccess = data?.ok === true || data?.success === true;
            if (!okSuccess) throw new Error(data?.error || 'Falha ao publicar');

            // Progress: 90% finalizing
            setPublishProgress(prev => ({
              ...prev,
              [target]: { ...prev[target], progress: 90, message: 'A finalizar...' }
            }));
            lastProgressUpdate = Date.now();

            // Update database with external post ID
            await supabase
              .from('posts')
              .update({
                external_post_ids: {
                  ...post.external_post_ids,
                  [target]: data.externalId,
                },
                publish_metadata: {
                  ...post.publish_metadata,
                  [target]: {
                    publishedAt: new Date().toISOString(),
                    postUrl: data.postUrl,
                  },
                },
              })
              .eq('id', id);

            // Progress: 100% done
            setPublishProgress(prev => ({
              ...prev,
              [target]: {
                ...prev[target],
                status: 'done',
                progress: 100,
                message: 'Publicado com sucesso!',
                postUrl: data.postUrl,
                publishedAt: new Date().toISOString(),
              }
            }));
            lastProgressUpdate = Date.now();

            successTracker[target] = true;
            clearInterval(heartbeatInterval);
            
            console.info(`[PUBLISH:${target}] Success`, { timestamp: new Date().toISOString() });
            
            // Success - break retry loop
            break;
          } catch (error) {
            attempts++;
            lastError = error instanceof Error ? error : new Error('Erro desconhecido');
            console.error(`[PUBLISH:${target}] Error on attempt ${attempts}/${maxAttempts}`, { error });
            
            if (attempts >= maxAttempts) {
              // Final failure after all retries
              clearInterval(heartbeatInterval);
              const errorDetails = {
                stage: 'publish',
                code: 'max-retries',
                message: lastError?.message || 'Erro ao publicar após várias tentativas',
                postId: id,
                platform: target,
                attempts: maxAttempts,
                timestamp: new Date().toISOString(),
              };
              
              setPublishProgress(prev => ({
                ...prev,
                [target]: {
                  ...prev[target],
                  status: 'error',
                  progress: 0,
                  error: lastError?.message || 'Erro ao publicar após várias tentativas',
                  message: `Erro na etapa: publish (max-retries)`,
                  technicalDetails: errorDetails,
                }
              }));
            }
          }
        }

        clearInterval(heartbeatInterval);
      }

      // Check success for all targets
      const allSuccess = targetsToPublish.every(t => successTracker[t]);

      if (allSuccess) {
        toast.success('Publicado com sucesso em todas as plataformas!');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('[PUBLISH] Error in executePublish', { error });
      throw error;
    }
  };

  const handleFinalReviewBack = () => {
    setShowFinalReview(false);
    setPendingPublishData(null);
    // Reset progress
    setPublishProgress({
      instagram: { platform: 'instagram', status: 'pending', progress: 0 },
      linkedin: { platform: 'linkedin', status: 'pending', progress: 0 },
    });
  };

  const handleFinalReviewRegenerate = async () => {
    if (!pendingPublishData) return;
    
    setShowFinalReview(false);
    
    // Clean up old blob URL (only if it's a blob URL, not a Getlate URL)
    if (pendingPublishData.pdfUrl && pendingPublishData.pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingPublishData.pdfUrl);
    }
    
    setGeneratedPdf(null);
    setPendingPublishData(null);
    
    toast.info('A regenerar PDF...');
    
    await handlePublishToTargets(pendingPublishData.scheduledDate, pendingPublishData.retryPlatform);
  };

  const handleFinalReviewConfirm = async () => {
    if (!pendingPublishData) return;
    
    setShowFinalReview(false);
    setPublishModalOpen(true);
    
    const { scheduledDate, pdfUrl, pdfBlob, pdfMetadata, selectedImages } = pendingPublishData;
    
    // Convert PDF blob to base64 if we have it
    let pdfBase64: string | undefined;
    if (pdfBlob) {
      try {
        const reader = new FileReader();
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });
        console.log('[PDF] Converted blob to base64', { sizeKB: (pdfBase64.length * 0.75 / 1024).toFixed(2) });
      } catch (error) {
        console.error('[PDF] Failed to convert blob to base64', error);
        toast.error('Erro ao processar PDF');
        return;
      }
    }
    
    const targetsToPublish = Object.entries(publishTargets).filter(([_, active]) => active).map(([target]) => target as PublishTarget);
    const successTracker: Record<PublishTarget, boolean> = { instagram: false, linkedin: false };
    
    try {
      await executePublish(targetsToPublish, selectedImages, scheduledDate, pdfUrl, pdfMetadata, successTracker, pdfBase64);
      
      // Clean up blob URL after successful publish (only if it's a blob URL)
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
      }
    } catch (error) {
      console.error('[FINAL_REVIEW] Error confirming publish', { error });
      toast.error('Erro ao publicar');
    } finally {
      setPendingPublishData(null);
    }
  };

  const handleReject = async (rejectNotes?: string) => {
    try {
      // Only include reviewed_by if user has a valid UUID
      const isValidUUID = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      const updateData: any = {
        status: 'rejected',
        notes: rejectNotes || notes,
        reviewed_at: new Date().toISOString(),
      };

      if (isValidUUID) {
        updateData.reviewed_by = user.id;
      }

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Call callback edge function
      try {
        const { data: callbackData, error: callbackError } = await supabase.functions.invoke('callback', {
          body: {
            post_id: id,
            status: 'rejected',
            notes: rejectNotes || notes,
          },
        });

        if (callbackError) {
          console.error('Callback error:', callbackError);
          toast.error('Rejeitado localmente, mas falha ao notificar n8n');
        }
      } catch (callbackError) {
        console.error('Failed to call callback:', callbackError);
      }
      
      toast.success('Publicação rejeitada');
      navigate('/');
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Falha ao rejeitar publicação');
      throw error;
    }
  };

  const handleRemoveSlide = async (template: 'A' | 'B', slideIndex: number) => {
    const isTemplateA = template === 'A';
    const currentImages = isTemplateA ? templateAImages : templateBImages;
    const archivedSlides = isTemplateA ? archivedSlidesA : archivedSlidesB;
    
    // Get the slide to archive
    const slideToArchive = currentImages[slideIndex];
    const newImages = currentImages.filter((_, idx) => idx !== slideIndex);
    const newArchived = [...archivedSlides, slideToArchive];
    
    const loadingToast = toast.loading('A arquivar slide...');
    
    // Update local state
    if (isTemplateA) {
      setTemplateAImages(newImages);
      setArchivedSlidesA(newArchived);
    } else {
      setTemplateBImages(newImages);
      setArchivedSlidesB(newArchived);
    }

    // Update metadata with new slide numbers
    const currentMetadata = isTemplateA ? post?.template_a_metadata : post?.template_b_metadata;
    const updatedMetadata = {
      ...currentMetadata,
      slides: newImages.map((img, idx) => ({
        ...currentMetadata?.slides?.[idx > slideIndex ? idx + 1 : idx],
        slide_num: idx + 1,
        total_slides: newImages.length,
        image_url: img,
      })),
      archived_slides: newArchived,
    };

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          [isTemplateA ? 'template_a_images' : 'template_b_images']: newImages,
          [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update post state
      setPost({
        ...post,
        [isTemplateA ? 'template_a_images' : 'template_b_images']: newImages,
        [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
      });
      
      toast.dismiss(loadingToast);
      toast.success(`Slide arquivado! Carrossel agora tem ${newImages.length} imagens ativas`);
    } catch (error) {
      console.error('Erro ao arquivar slide:', error);
      toast.dismiss(loadingToast);
      toast.error('Falha ao arquivar slide. Por favor, tente novamente.');
      // Revert local state
      if (isTemplateA) {
        setTemplateAImages(post?.template_a_images || []);
        setArchivedSlidesA(archivedSlides);
      } else {
        setTemplateBImages(post?.template_b_images || []);
        setArchivedSlidesB(archivedSlides);
      }
    }
  };

  const handleRestoreSlide = async (template: 'A' | 'B', archivedIndex: number) => {
    const isTemplateA = template === 'A';
    const currentImages = isTemplateA ? templateAImages : templateBImages;
    const archivedSlides = isTemplateA ? archivedSlidesA : archivedSlidesB;
    
    // Get the slide to restore
    const slideToRestore = archivedSlides[archivedIndex];
    const newArchived = archivedSlides.filter((_, idx) => idx !== archivedIndex);
    const newImages = [...currentImages, slideToRestore];
    
    const loadingToast = toast.loading('A restaurar slide...');
    
    // Update local state
    if (isTemplateA) {
      setTemplateAImages(newImages);
      setArchivedSlidesA(newArchived);
    } else {
      setTemplateBImages(newImages);
      setArchivedSlidesB(newArchived);
    }

    // Update metadata
    const currentMetadata = isTemplateA ? post?.template_a_metadata : post?.template_b_metadata;
    const updatedMetadata = {
      ...currentMetadata,
      slides: newImages.map((img, idx) => ({
        slide_num: idx + 1,
        total_slides: newImages.length,
        image_url: img,
      })),
      archived_slides: newArchived,
    };

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          [isTemplateA ? 'template_a_images' : 'template_b_images']: newImages,
          [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update post state
      setPost({
        ...post,
        [isTemplateA ? 'template_a_images' : 'template_b_images']: newImages,
        [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
      });
      
      toast.dismiss(loadingToast);
      toast.success(`Slide restaurado! Carrossel agora tem ${newImages.length} imagens ativas`);
    } catch (error) {
      console.error('Erro ao restaurar slide:', error);
      toast.dismiss(loadingToast);
      toast.error('Falha ao restaurar slide. Por favor, tente novamente.');
      // Revert local state
      if (isTemplateA) {
        setTemplateAImages(currentImages);
        setArchivedSlidesA(archivedSlides);
      } else {
        setTemplateBImages(currentImages);
        setArchivedSlidesB(archivedSlides);
      }
    }
  };

  const handleReorderSlides = async (template: 'A' | 'B', newOrder: string[]) => {
    const isTemplateA = template === 'A';
    
    // Update local state immediately for responsive UI
    if (isTemplateA) {
      setTemplateAImages(newOrder);
    } else {
      setTemplateBImages(newOrder);
    }

    // Update metadata with new order
    const currentMetadata = isTemplateA ? post?.template_a_metadata : post?.template_b_metadata;
    const updatedMetadata = {
      ...currentMetadata,
      slides: newOrder.map((img, idx) => ({
        ...currentMetadata?.slides?.find((s: any) => s.url === img),
        slide_num: idx + 1,
        total_slides: newOrder.length,
        url: img,
      })),
    };

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          [isTemplateA ? 'template_a_images' : 'template_b_images']: newOrder,
          [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update post state
      setPost({
        ...post,
        [isTemplateA ? 'template_a_images' : 'template_b_images']: newOrder,
        [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
      });
      
      toast.success('Ordem dos slides atualizada');
    } catch (error) {
      console.error('Erro ao reordenar slides:', error);
      toast.error('Falha ao reordenar slides. Por favor, tente novamente.');
      // Revert local state
      if (isTemplateA) {
        setTemplateAImages(post?.template_a_images || []);
      } else {
        setTemplateBImages(post?.template_b_images || []);
      }
    }
  };

  const handlePublishLinkedIn = async () => {
    if (!linkedinBody.trim()) {
      toast.error('O texto do post LinkedIn não pode estar vazio');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Por favor, selecione primeiro um modelo');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Preparar pageAlts a partir dos slides
      const selectedImages = selectedTemplate === 'A' ? templateAImages : templateBImages;
      const pageAlts = selectedImages.map((imgUrl, index) => {
        const imgKey = imgUrl.split('/').pop() || `image_${index}`;
        return post.alt_texts?.[imgKey] || `Slide ${index + 1} de ${selectedImages.length}`;
      });

      // Payload para o n8n
      const payload = {
        post_id: id,
        status: 'approved',
        selected_template: selectedTemplate,
        body_final: linkedinBody,
        hashtags_final: hashtags || [],
        pageAlts: pageAlts,
        reviewed_by: user?.email || 'unknown',
        notes: notes || ''
      };

      // Buscar webhook secret das variáveis de ambiente
      const webhookSecret = import.meta.env.VITE_N8N_WEBHOOK_SECRET;

      // Enviar para n8n webhook
      const response = await fetch('https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast.success('Post publicado no LinkedIn com sucesso!');
      console.log('LinkedIn publish result:', result);

      // Atualizar estado local do post
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          linkedin_body: linkedinBody,
          linkedin_published: true,
          status: 'approved'
        })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao atualizar post:', updateError);
      }

    } catch (error: any) {
      console.error('Error publishing to LinkedIn:', error);
      toast.error(`Falha ao publicar no LinkedIn: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const scrollToTemplates = () => {
    templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isApproved = post?.status === 'approved' || post?.status === 'published';

  const templateBadgeColors = {
    A: 'bg-gradient-to-r from-[#001f3f] to-[#003d7a] text-[#00d4ff] border-2 border-[#00d4ff] shadow-[0_0_25px_rgba(0,212,255,0.7)]',
    B: 'bg-gradient-to-r from-[#ff4500] to-[#ff6347] text-white border-2 border-[#ff6347] shadow-[0_0_25px_rgba(255,99,71,0.7)]',
  };

  if (loading) {
    return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </SidebarProvider>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-24">
          <DashboardHeader />
          
          <main className="flex-1 px-6 md:px-8 lg:px-10 xl:px-12 py-6 md:py-8 animate-fade-in overflow-auto">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="-ml-2 touch-target transition-all duration-150"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="text-sm">Voltar ao Painel</span>
              </Button>

              {/* Simple approval badge */}
              {isApproved && post.selected_template && (
                <Badge className={cn(
                  "text-sm",
                  templateBadgeColors[post.selected_template as 'A' | 'B']
                )}>
                  Template {post.selected_template} Selecionado
                </Badge>
              )}
            </div>

            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">{post.tema}</h1>
                <Badge variant="outline" className="gap-1">
                  <LayoutGrid className="h-3 w-3" />
                  Carrossel
                </Badge>
                {selectedTemplate && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedTemplate === 'A' ? templateAImages.length : templateBImages.length} imagens
                  </Badge>
                )}
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-snug">
                Selecione o modelo, plataformas e reveja o conteúdo
              </p>
            </div>

            {/* Publishing Configuration - Platform Selector Only */}
            <div className="mb-6 md:mb-8">
              <TargetSelector
                selectedTargets={publishTargets}
                onTargetsChange={setPublishTargets}
                validations={validations}
              />
            </div>

            {/* Templates - Side by side with equal height */}
            <div ref={templatesRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8 w-[85%] mx-auto">
              <CarouselPreview
                key={`template-a-${post.id}`}
                images={templateAImages}
                archivedSlides={archivedSlidesA}
                template="A"
                onSelect={() => setSelectedTemplate('A')}
                isSelected={selectedTemplate === 'A'}
                onRemoveSlide={(index) => handleRemoveSlide('A', index)}
                onRestoreSlide={(index) => handleRestoreSlide('A', index)}
                onReorderSlides={(newOrder) => handleReorderSlides('A', newOrder)}
                isApproved={isApproved}
                approvedTemplate={post.selected_template as 'A' | 'B' | null}
              />
              <CarouselPreview
                key={`template-b-${post.id}`}
                images={templateBImages}
                archivedSlides={archivedSlidesB}
                template="B"
                onSelect={() => setSelectedTemplate('B')}
                isSelected={selectedTemplate === 'B'}
                onRemoveSlide={(index) => handleRemoveSlide('B', index)}
                onRestoreSlide={(index) => handleRestoreSlide('B', index)}
                onReorderSlides={(newOrder) => handleReorderSlides('B', newOrder)}
                isApproved={isApproved}
                approvedTemplate={post.selected_template as 'A' | 'B' | null}
              />
            </div>

            {/* Caption Editor with Platform Differentiation */}
            <div className="mb-6 md:mb-8 space-y-4">
              {/* Toggle for differentiated captions */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {useDifferentCaptions ? (
                    <Unlink className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Link2 className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {useDifferentCaptions ? 'Legendas Diferenciadas' : 'Mesma Legenda para Ambas'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {useDifferentCaptions 
                        ? 'Cada plataforma terá sua própria legenda' 
                        : 'Instagram e LinkedIn usarão a mesma legenda'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={useDifferentCaptions ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newValue = !useDifferentCaptions;
                    setUseDifferentCaptions(newValue);
                    if (!newValue) {
                      // When turning off, sync LinkedIn with main caption
                      setLinkedinBody(caption);
                    } else {
                      // When turning on, separate the captions
                      setInstagramCaption(caption);
                    }
                  }}
                  className="min-w-[100px]"
                >
                  {useDifferentCaptions ? 'Unificar' : 'Diferenciar'}
                </Button>
              </div>

              {/* Unified Caption Editor (when not differentiated) */}
              {!useDifferentCaptions && (
                <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <Label className="text-base font-semibold">Legenda (Instagram & LinkedIn)</Label>
                  </div>
                  <CaptionEditor
                    initialCaption={post.caption}
                    initialHashtags={post.hashtags || []}
                    onChange={(newCaption, newHashtags) => {
                      setCaption(newCaption);
                      setHashtags(newHashtags);
                      setLinkedinBody(newCaption);
                    }}
                  />
                </div>
              )}

              {/* Differentiated Captions (when enabled) */}
              {useDifferentCaptions && (
                <div className="space-y-4">
                  {/* Instagram Caption */}
                  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      <Label className="text-base font-semibold">Legenda Instagram</Label>
                    </div>
                    <CaptionEditor
                      initialCaption={instagramCaption}
                      initialHashtags={post.hashtags || []}
                      onChange={(newCaption, newHashtags) => {
                        setInstagramCaption(newCaption);
                        setCaption(newCaption);
                        setHashtags(newHashtags);
                      }}
                    />
                  </div>

                  {/* LinkedIn Caption */}
                  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                      <Label className="text-base font-semibold">Legenda LinkedIn</Label>
                    </div>
                    <Textarea
                      placeholder="Escreve o texto do post para LinkedIn..."
                      value={linkedinBody}
                      onChange={(e) => setLinkedinBody(e.target.value)}
                      rows={6}
                      className="w-full mb-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hashtags: {hashtags?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || 'Sem hashtags'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="rounded-xl border border-border bg-card p-4 md:p-5 mb-6 md:mb-8 shadow-sm">
              <Label htmlFor="notes" className="text-base font-semibold mb-2 block tracking-tight">
                Notas Internas
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione notas internas sobre esta publicação..."
                className="min-h-[100px] text-sm"
              />
            </div>

            {/* Debug Panel - Only in DEV mode */}
            {import.meta.env.DEV && (
              <div className="mb-6 md:mb-8">
                <PublishDebugPanel
                  postId={id!}
                  targets={publishTargets}
                  postType="carousel"
                  caption={caption}
                  hashtags={hashtags}
                  mediaCount={selectedTemplate === 'A' ? templateAImages.length : templateBImages.length}
                  pdfMetadata={generatedPdf ? {
                    sizeMB: generatedPdf.sizeMB,
                    pages: generatedPdf.pages,
                    filename: generatedPdf.filename,
                  } : undefined}
                  pageAlts={(selectedTemplate === 'A' ? templateAImages : templateBImages).map((imgUrl, idx) => {
                    const imgKey = imgUrl.split('/').pop() || `image_${idx}`;
                    return post.alt_texts?.[imgKey] || `Slide ${idx + 1}`;
                  })}
                  progress={Object.values(publishProgress)}
                  pdfUrl={pendingPublishData?.pdfUrl}
                  pdfSource={(pendingPublishData?.pdfSource as 'client' | 'server') || 'server'}
                />
              </div>
            )}
          </main>

          <ActionBar
            canApprove={
              !!selectedTemplate && 
              Object.values(publishTargets).some(active => active) &&
              !Object.values(validations).some((v: any) => v?.errors?.length > 0)
            }
            disabledReason={
              !selectedTemplate 
                ? 'Selecionar um template.' 
                : !Object.values(publishTargets).some(active => active)
                ? 'Selecionar pelo menos uma plataforma.'
                : Object.values(validations).some((v: any) => v?.errors?.length > 0)
                ? 'Corrigir os erros indicados.'
                : undefined
            }
            onApprove={handleApprove}
            onReject={handleReject}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Publishing Modal */}
      <PublishModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        targets={publishTargets}
        postType="carousel"
        mediaCount={selectedTemplate === 'A' ? templateAImages.length : templateBImages.length}
        progress={publishProgress}
        onRetry={(platform) => {
          // Reset progress for retry
          setPublishProgress(prev => ({
            ...prev,
            [platform]: { platform, status: 'pending', progress: 0 }
          }));
          // Retry only the failed platform
          handlePublishToTargets(undefined, platform);
        }}
      />

      {/* Final Review Modal (LinkedIn PDF) */}
      {showFinalReview && pendingPublishData && (
        <FinalReviewModal
          open={showFinalReview}
          onBack={handleFinalReviewBack}
          onRegenerate={handleFinalReviewRegenerate}
          onConfirm={handleFinalReviewConfirm}
          pdfMetadata={{
            pages: pendingPublishData.pdfMetadata?.pages || 0,
            sizeMB: pendingPublishData.pdfMetadata?.sizeMB || 0,
            title: post.tema || id || 'carousel',
          }}
          pdfUrl={pendingPublishData.pdfUrl || ''}
          pageAlts={pendingPublishData.selectedImages.map((imgUrl, idx) => {
            const imgKey = imgUrl.split('/').pop() || `image_${idx}`;
            return post.alt_texts?.[imgKey] || `Slide ${idx + 1}/${pendingPublishData.selectedImages.length}`;
          })}
        />
      )}
    </SidebarProvider>
  );
};

export default Review;
