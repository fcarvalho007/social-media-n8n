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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2, ArrowLeft, CheckCircle2, Eye, LayoutGrid } from 'lucide-react';
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
  const [generatedPdf, setGeneratedPdf] = useState<{ blob: Blob; filename: string; sizeMB: number; pages: number } | null>(null);

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
        .single();

      if (error) throw error;
      
      setPost(data);
      setCaption(data.caption_edited || data.caption);
      setHashtags(data.hashtags_edited || data.hashtags || []);
      setSelectedTemplate(data.selected_template as 'A' | 'B' | null);
      setNotes(data.notes || '');
      setTemplateAImages(data.template_a_images || []);
      setTemplateBImages(data.template_b_images || []);
      
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
        pdfBlob = await generateCarouselPDF({
          images: selectedImages,
          title: post.tema,
        });

        const pageCount = selectedImages.length;
        pdfMetadata = { 
          sizeMB: pdfBlob.size / (1024 * 1024), 
          pages: pageCount 
        };

        // Store PDF metadata for debug panel
        setGeneratedPdf({
          blob: pdfBlob,
          filename: 'carousel.pdf',
          sizeMB: pdfMetadata.sizeMB,
          pages: pdfMetadata.pages,
        });

        const { valid, errors, warnings } = await import('@/lib/pdfGenerator').then(m => 
          m.validatePDFSize(pdfBlob!, pageCount)
        );

        if (!valid) {
          const errorMsg = errors.join('; ');
          targetsToPublish.forEach(target => {
            setPublishProgress(prev => ({
              ...prev,
              [target]: { 
                ...prev[target], 
                status: 'error', 
                progress: 0, 
                error: errorMsg,
                technicalDetails: { pdfMetadata, errors, warnings }
              }
            }));
          });
          toast.error(errorMsg);
          return;
        }

        if (warnings.length > 0) {
          warnings.forEach(w => toast.warning(w));
        }

        pdfUrl = URL.createObjectURL(pdfBlob);
      }

      // Publish to each platform with retry logic
      for (const target of targetsToPublish) {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: Error | null = null;

        while (attempts < maxAttempts) {
          try {
            const delay = attempts > 0 ? Math.pow(2, attempts) * 1000 : 0;
            if (delay > 0) {
              setPublishProgress(prev => ({
                ...prev,
                [target]: { 
                  ...prev[target], 
                  status: 'uploading', 
                  progress: 20, 
                  message: `A tentar novamente... (tentativa ${attempts + 1}/${maxAttempts})` 
                }
              }));
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            setPublishProgress(prev => ({
              ...prev,
              [target]: { ...prev[target], status: 'uploading', progress: 30, message: 'A carregar conteúdo...' }
            }));

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
              // LinkedIn: send PDF document
              const pageAlts = selectedImages.map((imgUrl, idx) => {
                const imgKey = imgUrl.split('/').pop() || `image_${idx}`;
                return post.alt_texts?.[imgKey] || `Slide ${idx + 1}/${selectedImages.length}`;
              });

              payload = {
                ...basePayload,
                body: caption,
                pdfUrl,
                pageAlts,
                pdfMetadata,
              };
            }

            const { data, error } = await supabase.functions.invoke('publish-to-getlate', {
              body: payload,
            });

            if (error) throw error;

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

            successTracker[target] = true;
            
            // Success - break retry loop
            break;
          } catch (error) {
            attempts++;
            lastError = error instanceof Error ? error : new Error('Erro desconhecido');
            console.error(`Error publishing to ${target} (attempt ${attempts}/${maxAttempts}):`, error);
            
            if (attempts >= maxAttempts) {
              // Final failure after all retries
              setPublishProgress(prev => ({
                ...prev,
                [target]: {
                  ...prev[target],
                  status: 'error',
                  progress: 0,
                  error: lastError?.message || 'Erro ao publicar após várias tentativas',
                  technicalDetails: {
                    attempts: maxAttempts,
                    lastError: lastError?.message,
                    timestamp: new Date().toISOString(),
                  },
                }
              }));
            }
          }
        }
      }

      // Clean up blob URL
      if (pdfUrl) {
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
      }

      // Check success for all targets
      const allSuccess = targetsToPublish.every(t => successTracker[t]);

      if (allSuccess) {
        toast.success('Publicado com sucesso em todas as plataformas!');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Error in publishing flow:', error);
      toast.error('Erro ao processar publicação');
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
    const newImages = currentImages.filter((_, idx) => idx !== slideIndex);
    
    toast.loading('A remover slide...');
    
    // Update local state
    if (isTemplateA) {
      setTemplateAImages(newImages);
    } else {
      setTemplateBImages(newImages);
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
      
      toast.success(`Slide removido! Carrossel agora tem ${newImages.length} imagens`);
    } catch (error) {
      console.error('Erro ao remover slide:', error);
      toast.error('Falha ao remover slide. Por favor, tente novamente.');
      // Revert local state
      if (isTemplateA) {
        setTemplateAImages(post?.template_a_images || []);
      } else {
        setTemplateBImages(post?.template_b_images || []);
      }
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
        <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
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
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-24">
          <DashboardHeader />
          
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in overflow-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="-ml-2 sm:ml-0 touch-target"
            size="sm"
          >
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Voltar ao Painel</span>
          </Button>

          {/* Simple approval badge */}
          {isApproved && post.selected_template && (
            <Badge className={cn(
              "text-xs sm:text-sm",
              templateBadgeColors[post.selected_template as 'A' | 'B']
            )}>
              Template {post.selected_template} Selecionado
            </Badge>
          )}
        </div>

        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{post.tema}</h2>
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
          <p className="text-xs sm:text-sm text-muted-foreground">
            Selecione o modelo, plataformas e reveja o conteúdo
          </p>
        </div>

        {/* Publishing Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <TargetSelector
            selectedTargets={publishTargets}
            onTargetsChange={setPublishTargets}
          />
          <PlatformRules
            selectedTargets={publishTargets}
            postType="carousel"
            validations={validations}
          />
        </div>

        {/* Templates - Side by side on desktop, stacked on mobile */}
        <div ref={templatesRef} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-3 sm:mb-4 md:mb-6 max-w-5xl mx-auto">
          <div className="w-full max-w-md mx-auto">
            <CarouselPreview
              key={`template-a-${post.id}`}
              images={templateAImages}
              template="A"
              onSelect={() => setSelectedTemplate('A')}
              isSelected={selectedTemplate === 'A'}
              onRemoveSlide={!isApproved ? (index) => handleRemoveSlide('A', index) : undefined}
              isApproved={isApproved}
              approvedTemplate={post.selected_template as 'A' | 'B' | null}
            />
          </div>
          <div className="w-full max-w-md mx-auto">
            <CarouselPreview
              key={`template-b-${post.id}`}
              images={templateBImages}
              template="B"
              onSelect={() => setSelectedTemplate('B')}
              isSelected={selectedTemplate === 'B'}
              onRemoveSlide={!isApproved ? (index) => handleRemoveSlide('B', index) : undefined}
              isApproved={isApproved}
              approvedTemplate={post.selected_template as 'A' | 'B' | null}
            />
          </div>
        </div>

        {/* Republish Warning for Approved Posts */}
        {isApproved && (
          <div className="mb-3 sm:mb-4 md:mb-6 rounded-lg border-2 border-primary/20 bg-primary/5 p-3 sm:p-4">
            <p className="text-sm text-muted-foreground">
              Esta publicação já foi aprovada. Pode alterar o template e a legenda e republicar. 
              <span className="font-semibold text-foreground"> O conteúdo será enviado novamente para o destino pré-definido.</span>
            </p>
          </div>
        )}

        {/* Caption and Hashtags Editor */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <CaptionEditor
            initialCaption={post.caption}
            initialHashtags={post.hashtags || []}
            onChange={(newCaption, newHashtags) => {
              setCaption(newCaption);
              setHashtags(newHashtags);
            }}
          />
        </div>

        {/* Internal Notes */}
        <div className="rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6">
          <Label htmlFor="notes" className="text-xs sm:text-sm md:text-base font-semibold mb-2 block">
            Notas Internas
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione notas internas sobre esta publicação..."
            className="min-h-[80px] sm:min-h-[100px] text-sm"
          />
        </div>

        {/* Debug Panel - Only in DEV mode */}
        {import.meta.env.DEV && (
          <div className="mb-3 sm:mb-4 md:mb-6">
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
                ? 'Selecione um template primeiro' 
                : !Object.values(publishTargets).some(active => active)
                ? 'Selecione pelo menos uma plataforma'
                : Object.values(validations).some((v: any) => v?.errors?.length > 0)
                ? 'Corrija os erros de validação'
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
    </SidebarProvider>
  );
};

export default Review;
