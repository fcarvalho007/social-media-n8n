import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { CarouselPreview } from '@/components/CarouselPreview';
import { CaptionEditor } from '@/components/CaptionEditor';
import { RichTextEditor } from '@/components/RichTextEditor';
import { HashtagManager } from '@/components/HashtagManager';
import SinglePlatformPreview from '@/components/publishing/SinglePlatformPreview';
import SplitPreviewDialog from '@/components/publishing/SplitPreviewDialog';
import { ActionBar } from '@/components/ActionBar';
import { PlatformTabs } from '@/components/publishing/PlatformTabs';
import { PlatformRules } from '@/components/publishing/PlatformRules';
import { PublishModal } from '@/components/publishing/PublishModal';
import { PublishDebugPanel } from '@/components/publishing/PublishDebugPanel';
import { PublishConfirmationModal } from '@/components/publishing/PublishConfirmationModal';
import { PublishCompletedModal } from '@/components/publishing/PublishCompletedModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageValidationAlert } from '@/components/ImageValidationAlert';
// Layout handled by MainLayout
import { Loader2, ArrowLeft, CheckCircle2, Eye, LayoutGrid, Linkedin, Instagram, Link2, Unlink, Code2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PublishTarget, PostType, PublishProgress } from '@/types/publishing';
import { validateAllTargets } from '@/lib/publishingValidation';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { useImagePrevalidation } from '@/hooks/useImagePrevalidation';
import { logger } from '@/lib/logger';

const Review = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Preview state
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const [showSinglePreview, setShowSinglePreview] = useState<{ platform: 'instagram' | 'linkedin'; open: boolean } | null>(null);
  
  // Publishing state - Pre-select both platforms by default
  const [publishTargets, setPublishTargets] = useState<Record<PublishTarget, boolean>>({
    instagram: true,
    linkedin: true,
  });
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishProgress, setPublishProgress] = useState<Record<PublishTarget, PublishProgress>>({
    instagram: { platform: 'instagram', status: 'pending', progress: 0 },
    linkedin: { platform: 'linkedin', status: 'pending', progress: 0 },
  });
  const [validations, setValidations] = useState<Record<string, any>>({});
  const templatesRef = useRef<HTMLDivElement>(null);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [showPublishCompleted, setShowPublishCompleted] = useState(false);
  const [publishResults, setPublishResults] = useState<{
    instagram?: { success: boolean; url?: string; error?: string };
    linkedin?: { success: boolean; url?: string; error?: string };
  }>({});
  const [previewActiveImages, setPreviewActiveImages] = useState<string[]>([]);
  
  // Publishing quota hook (applies to both Instagram and LinkedIn)
  const { instagram, refetch: refetchQuota } = usePublishingQuota();
  const publishingQuota = instagram.quota;
  const canPublishAnywhere = instagram.canPublish;
  const quotaText = instagram.quotaText;

  // ✅ FASE 3: Pré-validação de imagens (validar apenas template selecionado)
  const activeImagesForValidation = selectedTemplate 
    ? (selectedTemplate === 'A' ? templateAImages : templateBImages).filter(
        img => !(selectedTemplate === 'A' ? archivedSlidesA : archivedSlidesB).includes(img)
      )
    : [];

  const imageValidation = useImagePrevalidation({
    images: activeImagesForValidation,
    enabled: !!selectedTemplate && activeImagesForValidation.length > 0
  });

  // Track if user dismissed the validation alert
  const [validationAlertDismissed, setValidationAlertDismissed] = useState(false);
  const lastValidationContextRef = useRef<string>('');

  // Reset dismissal when template or images change
  useEffect(() => {
    const currentContext = `${selectedTemplate}-${imageValidation.summaryKey}`;
    if (currentContext !== lastValidationContextRef.current) {
      setValidationAlertDismissed(false);
      lastValidationContextRef.current = currentContext;
    }
  }, [selectedTemplate, imageValidation.summaryKey]);

  // Validation function to ensure slide consistency
  const validateSlideConsistency = (template: 'A' | 'B'): { valid: boolean; message?: string } => {
    const isTemplateA = template === 'A';
    const images = isTemplateA ? templateAImages : templateBImages;
    const archived = isTemplateA ? archivedSlidesA : archivedSlidesB;
    const metadata = post?.[`template_${template.toLowerCase()}_metadata`];
    
    const totalOriginal = metadata?.total_slides || metadata?.slides?.length || 0;
    const totalCurrent = images.length + archived.length;
    
    // Check for missing slides
    if (totalOriginal > 0 && totalOriginal !== totalCurrent) {
      const message = `Inconsistência no template ${template}: ${totalOriginal} slides originais, ${totalCurrent} atuais (${images.length} ativos + ${archived.length} arquivados)`;
      logger.error('[Validation] Slide consistency check failed', { template, totalOriginal, totalCurrent, images: images.length, archived: archived.length });
      return { valid: false, message };
    }
    
    // Check for duplicates between active and archived
    const allSlides = [...images, ...archived];
    const uniqueSlides = new Set(allSlides);
    if (uniqueSlides.size !== allSlides.length) {
      const message = `Template ${template}: slides duplicados detetados`;
      logger.error('[Validation] Duplicate slides detected', { template, total: allSlides.length, unique: uniqueSlides.size });
      return { valid: false, message };
    }
    
    // Check for archived slides in active images (should never happen)
    const hasArchivedInActive = images.some(img => archived.includes(img));
    if (hasArchivedInActive) {
      const message = `Template ${template}: slides arquivados encontrados nas imagens ativas`;
      logger.error('[Validation] Archived slides found in active images', { template });
      return { valid: false, message };
    }
    
    logger.debug('[Validation] Slide consistency check passed', { template, images: images.length, archived: archived.length });
    return { valid: true };
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  // Validate when targets, caption, hashtags or template change.
  // ⚠️ Importante: NÃO usar `caption` como guard — caption vazia também precisa revalidar.
  useEffect(() => {
    if (!post) return;

    const postType: PostType = 'carousel'; // Always carousel for IA posts
    const selectedImages = selectedTemplate === 'A' ? templateAImages : templateBImages;

    // ✅ Single source of truth para hashtags: derivar da caption (e do linkedinBody quando diferenciado).
    // O state `hashtags` (vindo da BD) só é usado para persistência, não para validação.
    const captionForHashtags = useDifferentCaptions ? `${instagramCaption} ${linkedinBody}` : caption;
    const hashtagsFromCaption = (captionForHashtags.match(/#[\w\u00C0-\u017F]+/g) || []) as string[];
    const effectiveHashtags = hashtagsFromCaption.length > 0 ? hashtagsFromCaption : hashtags;

    const validationResults = validateAllTargets(
      publishTargets,
      postType,
      {
        caption: useDifferentCaptions ? instagramCaption : caption,
        body: useDifferentCaptions ? linkedinBody : caption,
        hashtags: effectiveHashtags,
        mediaCount: selectedImages.length,
      }
    );

    setValidations(validationResults);
  }, [publishTargets, caption, linkedinBody, instagramCaption, useDifferentCaptions, hashtags, selectedTemplate, templateAImages, templateBImages, post]);

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
      
      // Set default caption with hashtags if no caption exists
      const defaultHashtags = '\n\n#educacao #marketing #marketingdigital #ia #digitalsprint\n\ntransparência: co-criado com IA';
      const currentCaption = data.caption_edited || data.caption || '';
      const captionWithHashtags = currentCaption.includes('#educacao') ? currentCaption : currentCaption + defaultHashtags;
      
      setCaption(captionWithHashtags);
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
      
  /**
   * ✅ ARQUITETURA DE SLIDES ARQUIVADOS:
   * 
   * 1. template_X_images (BD + Estado): Array COMPLETO de URLs (ativas + arquivadas)
   * 2. template_X_metadata.archived_slides (BD): Array de URLs arquivados
   * 3. archivedSlidesX (Estado local): Cópia de archived_slides para filtragem
   * 
   * FLUXO DE PUBLICAÇÃO:
   * - Ler template_X_images (TODOS os slides)
   * - Filtrar usando archived_slides (remover arquivados)
   * - Publicar apenas os não-arquivados
   * 
   * IMPORTANTE: template_X_images NUNCA é modificado ao arquivar/restaurar!
   */
  
  // Load archived slides from metadata
  const metadataA = data.template_a_metadata as any;
  const metadataB = data.template_b_metadata as any;
  const archivedA = Array.isArray(metadataA?.archived_slides) ? metadataA.archived_slides : [];
  const archivedB = Array.isArray(metadataB?.archived_slides) ? metadataB.archived_slides : [];
  
  setArchivedSlidesA(archivedA);
  setArchivedSlidesB(archivedB);

  // ✅ VALIDAÇÃO DE INTEGRIDADE: Verificar consistência dos dados
  const imagesA = data.template_a_images || [];
  const imagesB = data.template_b_images || [];
  const activeA = imagesA.filter((url: string) => !archivedA.includes(url));
  const activeB = imagesB.filter((url: string) => !archivedB.includes(url));
  
  console.log('[Load Post] 📊 Estado de Slides:', {
    templateA: {
      total: imagesA.length,
      archived: archivedA.length,
      active: activeA.length,
      expected: metadataA?.total_slides || 'N/A',
      allUrls: imagesA.map((url: string, i: number) => ({
        index: i + 1,
        url: url.substring(url.lastIndexOf('/') + 1),
        archived: archivedA.includes(url) ? '🗄️' : '✅'
      }))
    },
    templateB: {
      total: imagesB.length,
      archived: archivedB.length,
      active: activeB.length,
      expected: metadataB?.total_slides || 'N/A',
      allUrls: imagesB.map((url: string, i: number) => ({
        index: i + 1,
        url: url.substring(url.lastIndexOf('/') + 1),
        archived: archivedB.includes(url) ? '🗄️' : '✅'
      }))
    },
  });

  // Verificar se archived_slides é válido
  if (archivedA.length > 0 && !Array.isArray(metadataA?.archived_slides)) {
    console.error('[Load Post] ⚠️ Template A: archived_slides inválido', metadataA?.archived_slides);
    toast.warning('Template A: dados de slides arquivados podem estar corrompidos.');
  }
  
  if (archivedB.length > 0 && !Array.isArray(metadataB?.archived_slides)) {
    console.error('[Load Post] ⚠️ Template B: archived_slides inválido', metadataB?.archived_slides);
    toast.warning('Template B: dados de slides arquivados podem estar corrompidos.');
  }

  // Verificar se slides arquivados existem em template_X_images
  const missingA = archivedA.filter((url: string) => !imagesA.includes(url));
  const missingB = archivedB.filter((url: string) => !imagesB.includes(url));

  if (missingA.length > 0 || missingB.length > 0) {
    console.error('[Load Post] ❌ Slides arquivados NÃO encontrados na BD:', {
      templateA: missingA,
      templateB: missingB,
    });
    toast.error('⚠️ Dados inconsistentes: Alguns slides arquivados foram perdidos. Por favor, recarregue a página.', {
      duration: 8000,
    });
  }
  
  // Verificar se há duplicados em archived_slides
  const uniqueA = new Set(archivedA);
  const uniqueB = new Set(archivedB);
  if (uniqueA.size !== archivedA.length || uniqueB.size !== archivedB.length) {
    console.error('[Load Post] ⚠️ Duplicados em archived_slides:', {
      templateA: { total: archivedA.length, unique: uniqueA.size },
      templateB: { total: archivedB.length, unique: uniqueB.size },
    });
    toast.warning('Slides arquivados contêm duplicados. Recomenda-se recarregar a página.');
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

    // If scheduling, save to database and return
    if (scheduledDate) {
      try {
        const updateData: any = {
          status: 'approved',
          selected_template: selectedTemplate,
          caption_edited: caption,
          hashtags_edited: hashtags,
          notes,
          reviewed_at: new Date().toISOString(),
          publish_targets: publishTargets,
          scheduled_date: scheduledDate.toISOString(),
          // ✅ CORREÇÃO: Não sobrescrever template_X_images - a BD mantém array completo
        };
        
        console.log('[Approve Schedule] Guardando imagens ativas do template', selectedTemplate);

        const { error } = await supabase
          .from('posts')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        toast.success('Publicação agendada com sucesso!');
        navigate('/');
      } catch (error) {
        console.error('Erro ao agendar:', error);
        toast.error('Falha ao agendar publicação');
        throw error;
      }
      return;
    }

    // Calculate active images for preview
    const selectedImages = selectedTemplate === 'A' ? templateAImages : templateBImages;
    const archivedSlides = selectedTemplate === 'A' ? archivedSlidesA : archivedSlidesB;
    const activeImages = selectedImages.filter(img => !archivedSlides.includes(img));
    
    console.log('[Preview Modal] Imagens ativas para pré-visualização:', activeImages.length);
    
    // Store active images for modal preview
    setPreviewActiveImages(activeImages);

    // Show confirmation modal for immediate publishing
    setShowPublishConfirmation(true);
  };

  const handleConfirmPublish = async () => {
    setShowPublishConfirmation(false);
    setIsPublishing(true);
    setPublishResults({});

    try {
      // Save to database first
      
      // Get current active images for selected template
      const activeImages = selectedTemplate === 'A' ? templateAImages : templateBImages;
      
      const updateData: any = {
        status: 'approved',
        selected_template: selectedTemplate,
        caption_edited: caption,
        hashtags_edited: hashtags,
        notes,
        reviewed_at: new Date().toISOString(),
        publish_targets: publishTargets,
        // ✅ CORREÇÃO: Não sobrescrever template_X_images - a BD mantém array completo
      };
      
      console.log('[Approve Publish] Guardando imagens ativas do template', selectedTemplate);

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Publish to selected platforms and collect results
      const results: {
        instagram?: { success: boolean; url?: string; error?: string };
        linkedin?: { success: boolean; url?: string; error?: string };
      } = {};
      
      const publishPromises: Promise<{ platform: 'instagram' | 'linkedin'; success: boolean; url?: string; error?: string }>[] = [];
      
      if (publishTargets.instagram) {
        publishPromises.push(
          handlePublishInstagram()
            .then(() => ({ platform: 'instagram' as const, success: true }))
            .catch((error) => ({ platform: 'instagram' as const, success: false, error: error.message }))
        );
      }
      
      if (publishTargets.linkedin) {
        publishPromises.push(
          handlePublishLinkedIn()
            .then(() => ({ platform: 'linkedin' as const, success: true }))
            .catch((error) => ({ platform: 'linkedin' as const, success: false, error: error.message }))
        );
      }

      const publishedResults = await Promise.all(publishPromises);
      
      // Collect results
      publishedResults.forEach(result => {
        results[result.platform] = {
          success: result.success,
          url: result.url,
          error: result.error,
        };
      });

      setPublishResults(results);

      // If at least one succeeded, show completion modal
      const hasSuccess = publishedResults.some(r => r.success);
      if (hasSuccess) {
        setShowPublishCompleted(true);
        setPublishModalOpen(false);
      } else {
        // All failed - keep user on page
        toast.error('Todas as publicações falharam. Por favor, tente novamente.');
      }

    } catch (error) {
      console.error('Erro ao publicar:', error);
      toast.error('Falha ao publicar');
    } finally {
      setIsPublishing(false);
    }
  };


  const handleReject = async (rejectNotes?: string) => {
    try {
      const updateData: any = {
        status: 'rejected',
        notes: rejectNotes || notes,
        reviewed_at: new Date().toISOString(),
      };

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
    
    // ✅ CORREÇÃO CRÍTICA: Usar template_X_images da BD, não do estado local
    // O estado local (templateAImages/templateBImages) pode estar dessincronizado
    const allImages = isTemplateA ? post?.template_a_images : post?.template_b_images;
    if (!allImages || allImages.length === 0) {
      toast.error('Erro: Nenhuma imagem encontrada para arquivar');
      return;
    }
    
    const archivedSlides = isTemplateA ? archivedSlidesA : archivedSlidesB;
    
    // Get ACTIVE images (all images minus archived)
    const currentImages = allImages.filter((img: string) => !archivedSlides.includes(img));
    
    // Validate slideIndex
    if (slideIndex < 0 || slideIndex >= currentImages.length) {
      console.error(`[Archive] Índice inválido: ${slideIndex} (total: ${currentImages.length})`);
      toast.error('Erro: Slide inválido selecionado');
      return;
    }
    
    // Get the slide to archive
    const slideToArchive = currentImages[slideIndex];
    const newArchived = [...archivedSlides, slideToArchive];
    
    // Validate: archived slide must exist in allImages
    if (!allImages.includes(slideToArchive)) {
      console.error('[Archive] Slide não encontrado em template_X_images:', slideToArchive);
      toast.error('Erro: Slide não encontrado na base de dados');
      return;
    }
    
    // Validate no duplicates
    if (archivedSlides.includes(slideToArchive)) {
      console.error('[Archive] Slide já está arquivado:', slideToArchive);
      toast.error('Erro: Slide já está arquivado');
      return;
    }
    
    const activeAfter = currentImages.length - 1;
    const archivedAfter = newArchived.length;
    
    console.log(`[Archive] Template ${template}:`, {
      total: allImages.length,
      activeBefore: currentImages.length,
      activeAfter,
      archivedBefore: archivedSlides.length,
      archivedAfter,
      slideToArchive: slideToArchive.substring(slideToArchive.lastIndexOf('/') + 1),
    });
    
    const loadingToast = toast.loading('A arquivar slide...');
    
    // ✅ Update local state (archived list only)
    if (isTemplateA) {
      setArchivedSlidesA(newArchived);
    } else {
      setArchivedSlidesB(newArchived);
    }

    // ✅ CORREÇÃO: Criar metadata.slides com TODOS os slides + flag is_archived
    const currentMetadata = isTemplateA ? post?.template_a_metadata : post?.template_b_metadata;
    const updatedMetadata = {
      ...currentMetadata,
      slides: allImages.map((img: string, idx: number) => {
        const isArchived = newArchived.includes(img);
        return {
          url: img,
          slide_num: idx + 1,
          total_slides: allImages.length,
          is_archived: isArchived,
          alt_text: `Slide ${idx + 1}/${allImages.length}${isArchived ? ' (Arquivado)' : ''}`,
        };
      }),
      archived_slides: newArchived,
      total_slides: allImages.length,
      active_slides: activeAfter,
    };

    try {
      // ✅ CORREÇÃO CRÍTICA: NÃO atualizar template_X_images - mantém TODOS os slides na BD
      // Apenas atualizar metadata com a lista de arquivados
      const { error } = await supabase
        .from('posts')
        .update({
          [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
        })
        .eq('id', id);

      if (error) throw error;
      
      // ✅ Update local post state with new metadata
      setPost({
        ...post,
        [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
      });
      
      toast.dismiss(loadingToast);
      toast.success(`✓ Slide arquivado! ${activeAfter} de ${allImages.length} ativos`, {
        description: 'O slide arquivado não será publicado',
        duration: 4000,
      });
    } catch (error) {
      console.error('Erro ao arquivar slide:', error);
      toast.dismiss(loadingToast);
      toast.error('Falha ao arquivar slide. Por favor, tente novamente.');
      // ✅ Revert archived_slides
      if (isTemplateA) {
        setArchivedSlidesA(archivedSlides);
      } else {
        setArchivedSlidesB(archivedSlides);
      }
    }
  };

  const handleRestoreSlide = async (template: 'A' | 'B', archivedIndex: number) => {
    const isTemplateA = template === 'A';
    const archivedSlides = isTemplateA ? archivedSlidesA : archivedSlidesB;
    const allImages = isTemplateA ? post?.template_a_images : post?.template_b_images;
    
    if (!allImages || allImages.length === 0) {
      toast.error('Erro: Nenhuma imagem encontrada');
      return;
    }
    
    // Validate archivedIndex
    if (archivedIndex < 0 || archivedIndex >= archivedSlides.length) {
      console.error(`[Restore] Índice inválido: ${archivedIndex} (total arquivados: ${archivedSlides.length})`);
      toast.error('Erro: Slide arquivado inválido');
      return;
    }
    
    // Get the slide to restore
    const slideToRestore = archivedSlides[archivedIndex];
    const newArchived = archivedSlides.filter((_, idx) => idx !== archivedIndex);
    
    // Validate: slide to restore must exist in allImages
    if (!allImages.includes(slideToRestore)) {
      console.error('[Restore] Slide não encontrado em template_X_images:', slideToRestore);
      toast.error('Erro: Slide não encontrado na base de dados');
      return;
    }
    
    const activeAfter = allImages.length - newArchived.length;
    
    console.log(`[Restore] Template ${template}:`, {
      total: allImages.length,
      activeBefore: allImages.length - archivedSlides.length,
      activeAfter,
      archivedBefore: archivedSlides.length,
      archivedAfter: newArchived.length,
      slideToRestore: slideToRestore.substring(slideToRestore.lastIndexOf('/') + 1),
    });
    
    const loadingToast = toast.loading('A restaurar slide...');
    
    // ✅ Update local state (archived list only)
    if (isTemplateA) {
      setArchivedSlidesA(newArchived);
    } else {
      setArchivedSlidesB(newArchived);
    }

    // ✅ CORREÇÃO: Criar metadata.slides com TODOS os slides + flag is_archived
    const currentMetadata = isTemplateA ? post?.template_a_metadata : post?.template_b_metadata;
    const updatedMetadata = {
      ...currentMetadata,
      slides: allImages.map((img: string, idx: number) => {
        const isArchived = newArchived.includes(img);
        return {
          url: img,
          slide_num: idx + 1,
          total_slides: allImages.length,
          is_archived: isArchived,
          alt_text: `Slide ${idx + 1}/${allImages.length}${isArchived ? ' (Arquivado)' : ''}`,
        };
      }),
      archived_slides: newArchived,
      total_slides: allImages.length,
      active_slides: activeAfter,
    };

    try {
      // ✅ CORREÇÃO CRÍTICA: NÃO atualizar template_X_images - mantém TODOS os slides na BD
      const { error } = await supabase
        .from('posts')
        .update({
          [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
        })
        .eq('id', id);

      if (error) throw error;
      
      // ✅ Update local post state with new metadata
      setPost({
        ...post,
        [isTemplateA ? 'template_a_metadata' : 'template_b_metadata']: updatedMetadata,
      });
      
      toast.dismiss(loadingToast);
      toast.success(`✓ Slide restaurado! ${activeAfter} de ${allImages.length} ativos`, {
        description: 'O slide será incluído na publicação',
        duration: 4000,
      });
    } catch (error) {
      console.error('Erro ao restaurar slide:', error);
      toast.dismiss(loadingToast);
      toast.error('Falha ao restaurar slide. Por favor, tente novamente.');
      // ✅ Revert archived_slides
      if (isTemplateA) {
        setArchivedSlidesA(archivedSlides);
      } else {
        setArchivedSlidesB(archivedSlides);
      }
    }
  };

  const handleReorderSlides = async (template: 'A' | 'B', newOrder: string[]) => {
    const isTemplateA = template === 'A';
    const archivedSlides = isTemplateA ? archivedSlidesA : archivedSlidesB;
    const currentImages = isTemplateA ? templateAImages : templateBImages;
    
    // Validate new order before applying
    if (newOrder.length !== currentImages.length) {
      console.error(`[Reorder] Inconsistência: esperado ${currentImages.length}, recebido ${newOrder.length}`);
      toast.error('Erro ao reordenar: número de slides incorreto');
      return;
    }
    
    // Ensure no archived slides are in the new order
    const hasArchivedSlides = newOrder.some(img => archivedSlides.includes(img));
    if (hasArchivedSlides) {
      console.error('[Reorder] Slides arquivados encontrados na nova ordem');
      toast.error('Erro: Slides arquivados não podem ser reordenados');
      return;
    }
    
    console.log(`[Reorder] Template ${template}: ${currentImages.length} slides mantidos, ${archivedSlides.length} arquivados`);
    
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

  // Helper to check if preview is available
  const canPreview = () => {
    return publishTargets.instagram || publishTargets.linkedin;
  };

  // Handle preview button click
  const handlePreviewClick = () => {
    if (!canPreview()) {
      toast.error('Selecione pelo menos uma plataforma');
      return;
    }

    const bothActive = publishTargets.instagram && publishTargets.linkedin;
    
    if (bothActive) {
      // Open split preview
      setShowSplitPreview(true);
    } else if (publishTargets.instagram) {
      // Open Instagram only
      setShowSinglePreview({ platform: 'instagram', open: true });
    } else if (publishTargets.linkedin) {
      // Open LinkedIn only
      setShowSinglePreview({ platform: 'linkedin', open: true });
    }
  };

  const handlePublishInstagram = async () => {
    if (!caption?.trim()) {
      toast.error('A legenda do Instagram não pode estar vazia');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Por favor, selecione primeiro um modelo');
      return;
    }

    const loadingToast = toast.loading('A publicar no Instagram...');
    
    try {
      // ✅ CORREÇÃO CRÍTICA: Ler diretamente da BD, não do estado local
      const allImages = selectedTemplate === 'A' ? post?.template_a_images : post?.template_b_images;
      const metadata = selectedTemplate === 'A' ? post?.template_a_metadata : post?.template_b_metadata;
      const archivedSlides = selectedTemplate === 'A' ? archivedSlidesA : archivedSlidesB;
      
      if (!allImages || allImages.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('Erro: Nenhuma imagem encontrada para publicar');
        return;
      }
      
      // ✅ VALIDAÇÃO PRÉ-PUBLICAÇÃO: Verificar sincronização
      const metadataArchived = metadata?.archived_slides || [];
      if (JSON.stringify(archivedSlides.sort()) !== JSON.stringify(metadataArchived.sort())) {
        console.error('[Pre-Publish Instagram] ⚠️ DESSINCRONIZAÇÃO DETECTADA:', {
          stateArchived: archivedSlides,
          metadataArchived,
        });
        
        toast.dismiss(loadingToast);
        toast.error('Dados de slides arquivados dessincronizados!', {
          description: 'Por favor, recarregue a página antes de publicar.',
          duration: 8000,
          action: {
            label: 'Recarregar',
            onClick: () => window.location.reload(),
          },
        });
        return;
      }
      
      // Filter out archived slides - this is EXACTLY what will be published
      const imagesToPublish = allImages.filter((img: string) => !archivedSlides.includes(img));
      
      // ✅ VALIDAÇÃO FINAL: Certificar que temos slides para publicar
      if (imagesToPublish.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('Nenhum slide ativo para publicar. Restaure pelo menos um slide.');
        return;
      }
      
      // ✅ LOGGING DETALHADO
      console.log('[Pre-Publish Instagram] 📋 Validação Completa:', {
        template: selectedTemplate,
        totalImages: allImages.length,
        archivedCount: archivedSlides.length,
        activeCount: imagesToPublish.length,
        expected: allImages.length - archivedSlides.length,
        isValid: imagesToPublish.length === (allImages.length - archivedSlides.length),
        allImages: allImages.map((url: string, i: number) => ({
          index: i + 1,
          filename: url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 20),
          archived: archivedSlides.includes(url) ? '🗄️ ARQUIVADO' : '✅ ATIVO',
          willPublish: !archivedSlides.includes(url) ? '📤 SIM' : '❌ NÃO'
        }))
      });

      // ✅ Verificação de consistência
      if (imagesToPublish.length !== (allImages.length - archivedSlides.length)) {
        const error = `Inconsistência: ${imagesToPublish.length} slides a publicar, esperado ${allImages.length - archivedSlides.length}`;
        console.error('[Pre-Publish Instagram] ❌', error);
        toast.dismiss(loadingToast);
        toast.error(error);
        return;
      }
      
      // Instagram limit: MAX 10 slides - force user to archive
      if (imagesToPublish.length > 10) {
        toast.dismiss(loadingToast);
        toast.error(`Instagram permite máx. 10 imagens. Atualmente tem ${imagesToPublish.length}. Por favor, arquive ${imagesToPublish.length - 10} slide(s).`);
        return;
      }

      const invalidUrls = imagesToPublish.filter(url => 
        !url || typeof url !== 'string' || !url.startsWith('https://')
      );
      
      if (invalidUrls.length > 0) {
        console.error('Invalid image URLs:', invalidUrls);
        toast.dismiss(loadingToast);
        toast.error(`Encontradas ${invalidUrls.length} URL(s) inválida(s)`);
        return;
      }

      const pageAlts = imagesToPublish.map((imgUrl, index) => {
        const imgKey = imgUrl.split('/').pop() || `image_${index}`;
        return post.alt_texts?.[imgKey] || `Slide ${index + 1} de ${imagesToPublish.length}`;
      });

      const payload = {
        platform: 'instagram',
        post_id: id,
        status: 'approved',
        selected_template: selectedTemplate,
        caption_final: useDifferentCaptions ? instagramCaption : caption,
        hashtags_final: hashtags || [],
        images: imagesToPublish,
        pageAlts: pageAlts,
        reviewed_by: 'user',
        notes: ''
      };

      console.log('[Instagram] Payload a enviar:', {
        platform: payload.platform,
        post_id: payload.post_id,
        selected_template: payload.selected_template,
        imageCount: payload.images.length,
        images: payload.images,
        caption_length: payload.caption_final.length,
        hashtags_count: payload.hashtags_final.length,
      });

      const { data, error } = await supabase.functions.invoke('publish-proxy', {
        body: payload,
      });

      if (error) {
        console.error('[Instagram] Edge function error:', error);
        throw new Error(error.message || 'Failed to call publish proxy');
      }

      // ✅ Log resultado da publicação
      console.log('[Publish Instagram] Success:', {
        imagesPublished: imagesToPublish.length,
        response: data
      });
      console.log('[Instagram] Publish result:', data);

      toast.dismiss(loadingToast);
      toast.success('✓ Publicado no Instagram com sucesso!', {
        duration: 5000,
        className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0',
      });

      // Update post status to published
      // ✅ CORREÇÃO: Não sobrescrever template_X_images - a BD mantém array completo (ativas + arquivadas)
      await supabase
        .from('posts')
        .update({
          caption_edited: useDifferentCaptions ? instagramCaption : caption,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      console.log('[Instagram] Post publicado na BD com', imagesToPublish.length, 'imagens');
      
      // Register publication in quota
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        await supabase.from('publication_quota').insert({
          user_id: userData.user.id,
          platform: 'instagram',
          post_type: 'carousel',
          post_id: id,
        });
        
        // Refetch quota to update UI
        refetchQuota();
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('[Instagram] Error:', error);
      toast.error(`Falha: ${error.message}`);
    }
  };

  const handlePublishLinkedIn = async () => {
    if (!linkedinBody?.trim()) {
      toast.error('O texto da publicação no LinkedIn não pode estar vazio');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Por favor, selecione primeiro um modelo');
      return;
    }

    const loadingToast = toast.loading('A publicar no LinkedIn...');
    
    try {
      // ✅ CORREÇÃO CRÍTICA: Ler diretamente da BD, não do estado local
      const allImages = selectedTemplate === 'A' ? post?.template_a_images : post?.template_b_images;
      const metadata = selectedTemplate === 'A' ? post?.template_a_metadata : post?.template_b_metadata;
      const archivedSlides = selectedTemplate === 'A' ? archivedSlidesA : archivedSlidesB;
      
      if (!allImages || allImages.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('Erro: Nenhuma imagem encontrada para publicar');
        return;
      }
      
      // ✅ VALIDAÇÃO PRÉ-PUBLICAÇÃO: Verificar sincronização
      const metadataArchived = metadata?.archived_slides || [];
      if (JSON.stringify(archivedSlides.sort()) !== JSON.stringify(metadataArchived.sort())) {
        console.error('[Pre-Publish LinkedIn] ⚠️ DESSINCRONIZAÇÃO DETECTADA:', {
          stateArchived: archivedSlides,
          metadataArchived,
        });
        
        toast.dismiss(loadingToast);
        toast.error('Dados de slides arquivados dessincronizados!', {
          description: 'Por favor, recarregue a página antes de publicar.',
          duration: 8000,
          action: {
            label: 'Recarregar',
            onClick: () => window.location.reload(),
          },
        });
        return;
      }
      
      // Filter out archived slides - this is EXACTLY what will be published
      const imagesToPublish = allImages.filter((img: string) => !archivedSlides.includes(img));
      
      // ✅ VALIDAÇÃO FINAL: Certificar que temos slides para publicar
      if (imagesToPublish.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('Nenhum slide ativo para publicar. Restaure pelo menos um slide.');
        return;
      }
      
      // ✅ LOGGING DETALHADO
      console.log('[Pre-Publish LinkedIn] 📋 Validação Completa:', {
        template: selectedTemplate,
        totalImages: allImages.length,
        archivedCount: archivedSlides.length,
        activeCount: imagesToPublish.length,
        expected: allImages.length - archivedSlides.length,
        isValid: imagesToPublish.length === (allImages.length - archivedSlides.length),
        allImages: allImages.map((url: string, i: number) => ({
          index: i + 1,
          filename: url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 20),
          archived: archivedSlides.includes(url) ? '🗄️ ARQUIVADO' : '✅ ATIVO',
          willPublish: !archivedSlides.includes(url) ? '📤 SIM' : '❌ NÃO'
        }))
      });

      // ✅ Verificação de consistência
      if (imagesToPublish.length !== (allImages.length - archivedSlides.length)) {
        const error = `Inconsistência: ${imagesToPublish.length} slides a publicar, esperado ${allImages.length - archivedSlides.length}`;
        console.error('[Pre-Publish LinkedIn] ❌', error);
        toast.dismiss(loadingToast);
        toast.error(error);
        return;
      }
      
      // Validate we have images
      if (!imagesToPublish || imagesToPublish.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('Não há imagens ativas para publicar');
        return;
      }

      const invalidUrls = imagesToPublish.filter(url => 
        !url || typeof url !== 'string' || !url.startsWith('https://')
      );
      
      if (invalidUrls.length > 0) {
        console.error('Invalid image URLs:', invalidUrls);
        toast.dismiss(loadingToast);
        toast.error(`Encontradas ${invalidUrls.length} URL(s) inválida(s)`);
        return;
      }

      const pageAlts = imagesToPublish.map((imgUrl, index) => {
        const imgKey = imgUrl.split('/').pop() || `image_${index}`;
        return post.alt_texts?.[imgKey] || `Slide ${index + 1} de ${imagesToPublish.length}`;
      });

      const payload = {
        platform: 'linkedin',
        post_id: id,
        status: 'approved',
        selected_template: selectedTemplate,
        body_final: linkedinBody,
        hashtags_final: hashtags || [],
        images: imagesToPublish,
        pageAlts: pageAlts,
        reviewed_by: 'user',
        notes: ''
      };

      console.log('[LinkedIn] Payload a enviar:', {
        platform: payload.platform,
        post_id: payload.post_id,
        selected_template: payload.selected_template,
        imageCount: payload.images.length,
        images: payload.images,
        body_length: payload.body_final.length,
        hashtags_count: payload.hashtags_final.length,
      });

      const { data, error } = await supabase.functions.invoke('publish-proxy', {
        body: payload,
      });

      if (error) {
        console.error('[LinkedIn] Edge function error:', error);
        throw new Error(error.message || 'Failed to call publish proxy');
      }

      // ✅ Log resultado da publicação
      console.log('[Publish LinkedIn] Success:', {
        imagesPublished: imagesToPublish.length,
        response: data
      });
      console.log('[LinkedIn] Publish result:', data);

      toast.dismiss(loadingToast);
      toast.success('✓ Publicado no LinkedIn com sucesso!', {
        duration: 5000,
        className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0',
      });

      // Update post status to published
      // ✅ CORREÇÃO: Não sobrescrever template_X_images - a BD mantém array completo (ativas + arquivadas)
      await supabase
        .from('posts')
        .update({
          linkedin_body: linkedinBody,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      console.log('[LinkedIn] Post publicado na BD com', imagesToPublish.length, 'imagens');

      // Register publication in quota
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        await supabase.from('publication_quota').insert({
          user_id: userData.user.id,
          platform: 'linkedin',
          post_type: 'carousel',
          post_id: id,
        });
        
        // Refetch quota to update UI
        refetchQuota();
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('[LinkedIn] Error:', error);
      toast.error(`Falha: ${error.message}`);
    }
  };

  const handleRevertToPending = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'pending',
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Post voltou para pendentes');
      navigate('/');
    } catch (error) {
      console.error('Erro ao voltar para pendentes:', error);
      toast.error('Falha ao voltar para pendentes');
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="pb-20 sm:pb-24">
      {/* Refined Header - Iconosquare Style */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb + Back Navigation */}
          <div className="flex items-center justify-between py-3 border-b border-border/40">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="-ml-2 h-8 px-2 text-sm hover:bg-accent transition-colors duration-150 focus:ring-2 focus:ring-primary/40"
              size="sm"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              <span className="font-medium">Voltar a Pendentes</span>
            </Button>
            
            <nav className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>Painel de Conteúdo</span>
              <span>›</span>
              <span className="text-foreground font-medium">Revisão</span>
            </nav>
          </div>

          {/* Header Principal */}
          <div className="py-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight leading-snug mb-1">
                  Revisão de Publicação
                </h1>
                <p className="text-sm text-muted-foreground leading-snug truncate">
                  {post.title}
                </p>
              </div>
            </div>

            {/* Platform Tabs */}
            <PlatformTabs
              selectedTargets={publishTargets}
              onTargetsChange={setPublishTargets}
              validations={validations}
              instagramQuotaText={quotaText}
              instagramCanPublish={canPublishAnywhere}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area - Responsive */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

        {/* Templates - Side by side with equal height and responsive gap */}
        <div ref={templatesRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-12 mb-6 md:mb-8 max-w-[1440px] mx-auto">
          <div className="h-full flex flex-col min-w-0 lg:min-w-[520px] lg:max-w-[620px]">
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
          </div>
          <div className="h-full flex flex-col min-w-0 lg:min-w-[520px] lg:max-w-[620px]">
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
        </div>

        {/* Image Validation Alert - Show when there are problems with current template images */}
        {selectedTemplate && imageValidation.hasProblems && !validationAlertDismissed && !loading && (
          <ImageValidationAlert
            corsIssues={imageValidation.summary.corsIssues}
            otherErrors={imageValidation.summary.otherErrors}
            total={activeImagesForValidation.length}
            validations={imageValidation.validations}
            onDismiss={() => setValidationAlertDismissed(true)}
          />
        )}

        {/* Slide Consistency Warning */}
        {selectedTemplate && !validateSlideConsistency(selectedTemplate).valid && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-500">
              <strong>Inconsistência detetada:</strong> {validateSlideConsistency(selectedTemplate).message}
              <br />
              <span className="text-sm">Por favor, recarregue a página ou contacte o suporte.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Caption Editor with Platform Differentiation */}
        <div className="mb-6 md:mb-8 space-y-6">
          {/* Section Header */}
          <div className="border-t border-border/60 pt-6">
            <h2 className="text-lg font-semibold tracking-tight leading-snug mb-1">Legendas</h2>
            <p className="text-sm text-muted-foreground">Configure as legendas para cada plataforma selecionada</p>
          </div>
          {/* Toggle for differentiated captions - Only show when both platforms active */}
          {publishTargets.instagram && publishTargets.linkedin && (
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
                    setLinkedinBody(caption);
                  } else {
                    setInstagramCaption(caption);
                  }
                }}
                className="min-w-[100px]"
              >
                {useDifferentCaptions ? 'Unificar' : 'Diferenciar'}
              </Button>
            </div>
          )}

                {/* Unified Caption Editor (when both platforms + not differentiated) */}
                {publishTargets.instagram && publishTargets.linkedin && !useDifferentCaptions && (
                  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <Label className="text-base font-semibold">Legenda (Instagram & LinkedIn)</Label>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handlePreviewClick}
                        disabled={!canPreview()}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        Pré-visualizar
                      </Button>
                    </div>
                    <RichTextEditor
                      value={caption}
                      onChange={(newCaption) => {
                        setCaption(newCaption);
                        setLinkedinBody(newCaption);
                      }}
                      placeholder="Escreve a legenda para ambas as plataformas..."
                      rows={15}
                      className="text-[15px] leading-relaxed"
                    />
                    <HashtagManager
                      hashtags={hashtags}
                      onChange={setHashtags}
                      caption={caption}
                      onCaptionChange={(newCaption) => {
                        setCaption(newCaption);
                        setLinkedinBody(newCaption);
                      }}
                    />
                  </div>
                )}

                {/* Differentiated Captions (when both platforms + differentiated enabled) */}
                {publishTargets.instagram && publishTargets.linkedin && useDifferentCaptions && (
                  <div className="space-y-4">
                    {/* Instagram Caption */}
                    <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          <Label className="text-base font-semibold">Legenda Instagram</Label>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowSinglePreview({ platform: 'instagram', open: true })}
                          className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                          Pré-visualizar IG
                        </Button>
                      </div>
                      <RichTextEditor
                        value={instagramCaption}
                        onChange={(newCaption) => {
                          setInstagramCaption(newCaption);
                          setCaption(newCaption);
                        }}
                        placeholder="Escreve a legenda para Instagram..."
                        rows={15}
                        className="text-[15px] leading-relaxed"
                      />
                      <HashtagManager
                        hashtags={hashtags}
                        onChange={setHashtags}
                        caption={instagramCaption}
                        onCaptionChange={(newCaption) => {
                          setInstagramCaption(newCaption);
                          setCaption(newCaption);
                        }}
                      />
                    </div>

                    {/* LinkedIn Caption */}
                    <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                          <Label className="text-base font-semibold">Legenda LinkedIn</Label>
                          <Badge variant="secondary" className="text-xs">Documento (PDF)</Badge>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowSinglePreview({ platform: 'linkedin', open: true })}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                          Pré-visualizar LI
                        </Button>
                      </div>
                      <RichTextEditor
                        value={linkedinBody}
                        onChange={setLinkedinBody}
                        placeholder="Escreve a legenda para LinkedIn..."
                        rows={15}
                        maxLength={3000}
                        className="text-[15px] leading-relaxed"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-muted-foreground">
                          Hashtags: {hashtags?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || 'Sem hashtags'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instagram Only */}
                {publishTargets.instagram && !publishTargets.linkedin && (
                  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <Label className="text-base font-semibold">Legenda Instagram</Label>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowSinglePreview({ platform: 'instagram', open: true })}
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        Pré-visualizar
                      </Button>
                    </div>
                    <RichTextEditor
                      value={caption}
                      onChange={setCaption}
                      placeholder="Escreve a legenda para Instagram..."
                      rows={15}
                      className="text-[15px] leading-relaxed"
                    />
                    <HashtagManager
                      hashtags={hashtags}
                      onChange={setHashtags}
                      caption={caption}
                      onCaptionChange={setCaption}
                    />
                  </div>
                )}

                {/* LinkedIn Only */}
                {!publishTargets.instagram && publishTargets.linkedin && (
                  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <Label className="text-base font-semibold">Legenda LinkedIn</Label>
                        <Badge variant="secondary" className="text-xs">Documento (PDF)</Badge>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowSinglePreview({ platform: 'linkedin', open: true })}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        Pré-visualizar
                      </Button>
                    </div>
                    <RichTextEditor
                      value={linkedinBody}
                      onChange={setLinkedinBody}
                      placeholder="Escreve a legenda para LinkedIn..."
                      rows={15}
                      className="text-[15px] leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {selectedTemplate ? (
                          <>Documento: {(selectedTemplate === 'A' ? templateAImages.length : templateBImages.length)} páginas</>
                        ) : (
                          <>Hashtags: {hashtags?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || 'Sem hashtags'}</>
                      )}
                    </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Debug Panel - Minimized */}
              {import.meta.env.DEV && (
                <div className="mb-6 md:mb-8">
                  {showDebugPanel ? (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebugPanel(false)}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <Code2 className="h-4 w-4" />
                        Ocultar Debug Panel
                      </Button>
                      <PublishDebugPanel
                        postId={id!}
                        targets={publishTargets}
                    postType="carousel"
                    caption={caption}
                    hashtags={hashtags}
                    mediaCount={selectedTemplate === 'A' ? templateAImages.length : templateBImages.length}
                    pageAlts={(selectedTemplate === 'A' ? templateAImages : templateBImages).map((imgUrl, idx) => {
                      const imgKey = imgUrl.split('/').pop() || `image_${idx}`;
                      return post.alt_texts?.[imgKey] || `Slide ${idx + 1}`;
                    })}
                    progress={Object.values(publishProgress)}
                  />
                    </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebugPanel(true)}
                    className="flex items-center gap-2"
                  >
                    <Code2 className="h-4 w-4" />
                    <span className="text-xs">Debug</span>
                  </Button>
                )}
              </div>
            )}


              {/* Metadata - Now at bottom */}
              <div className="mb-4 text-sm text-muted-foreground space-y-1">
                {post.status === 'pending' && (
                  <p>
                    <strong>Criado:</strong>{' '}
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
                  </p>
                )}
                {post.reviewed_at && (
                  <p>
                    <strong>Revisado:</strong>{' '}
                    {formatDistanceToNow(new Date(post.reviewed_at), { addSuffix: true, locale: pt })}
                  </p>
                )}
              </div>
            </div>

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
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevertToPending={handleRevertToPending}
            onSave={handleSave}
            publishTargets={publishTargets}
            validations={validations}
            contentType="carousel"
            mediaCount={selectedTemplate === 'A' ? templateAImages.length : templateBImages.length}
            instagramQuotaText={quotaText}
            instagramCanPublish={canPublishAnywhere}
          />

      {/* Publishing Modal */}
      <PublishModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        targets={publishTargets}
        postType="carousel"
        mediaCount={selectedTemplate === 'A' ? templateAImages.length : templateBImages.length}
        progress={publishProgress}
      />

      {/* Preview Dialogs */}
      {/* Split Preview (IG + LI) */}
      <SplitPreviewDialog
        open={showSplitPreview}
        onOpenChange={setShowSplitPreview}
        selectedPlatforms={Object.entries(publishTargets).filter(([_, enabled]) => enabled).map(([platform]) => platform)}
        mediaCount={selectedTemplate ? (selectedTemplate === 'A' ? templateAImages.length : templateBImages.length) : 1}
        hasWarnings={Object.values(validations).some(v => v?.warnings?.length > 0 || v?.errors?.length > 0)}
        warningCount={Object.values(validations).reduce((acc, v) => acc + (v?.warnings?.length || 0) + (v?.errors?.length || 0), 0)}
        instagramCaption={useDifferentCaptions ? instagramCaption : caption}
        linkedinCaption={linkedinBody}
        images={selectedTemplate ? (selectedTemplate === 'A' ? templateAImages : templateBImages) : []}
      />

      {/* Single Platform Preview */}
      {showSinglePreview && (
        <SinglePlatformPreview
          open={showSinglePreview.open}
          onOpenChange={(open) => setShowSinglePreview(open ? showSinglePreview : null)}
          platform={showSinglePreview.platform}
          caption={showSinglePreview.platform === 'instagram' 
            ? (useDifferentCaptions ? instagramCaption : caption) 
            : linkedinBody}
          hashtags={hashtags}
          mediaCount={selectedTemplate ? (selectedTemplate === 'A' ? templateAImages.length : templateBImages.length) : 1}
          isDocument={showSinglePreview.platform === 'linkedin'}
        />
      )}

      {/* Publish Confirmation Modal */}
      <PublishConfirmationModal
        open={showPublishConfirmation}
        onOpenChange={setShowPublishConfirmation}
        onConfirm={handleConfirmPublish}
        publishTargets={publishTargets}
        validations={validations}
        contentType="carousel"
        mediaCount={previewActiveImages.length}
        isPublishing={isPublishing}
        caption={caption}
        linkedinBody={linkedinBody}
        activeImages={previewActiveImages}
        useDifferentCaptions={useDifferentCaptions}
        instagramCaption={instagramCaption}
      />

      {/* Publish Completed Modal */}
      <PublishCompletedModal
        open={showPublishCompleted}
        onOpenChange={setShowPublishCompleted}
        results={publishResults}
        onNavigateToPending={() => {
          setShowPublishCompleted(false);
          navigate('/pending');
        }}
        onNavigateToDashboard={() => {
          setShowPublishCompleted(false);
          navigate('/');
        }}
      />
    </div>
  );
};

export default Review;
