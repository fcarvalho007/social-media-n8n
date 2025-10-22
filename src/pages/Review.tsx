import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { CarouselPreview } from '@/components/CarouselPreview';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ActionBar } from '@/components/ActionBar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2, ArrowLeft, CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

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

  useEffect(() => {
    fetchPost();
  }, [id]);

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

  const handleApprove = async () => {
    if (!selectedTemplate) {
      toast.error('Por favor, selecione primeiro um modelo');
      return;
    }

    try {
      // Only include reviewed_by if user has a valid UUID
      const isValidUUID = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      const updateData: any = {
        status: 'approved',
        selected_template: selectedTemplate,
        caption_edited: caption,
        hashtags_edited: hashtags,
        notes,
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
            status: 'approved',
            selected_template: selectedTemplate,
            caption_edited: caption,
            hashtags_edited: hashtags,
            notes,
          },
        });

        if (callbackError) {
          console.error('Callback error:', callbackError);
          toast.error('Aprovado localmente, mas falha ao notificar n8n');
        }
      } catch (callbackError) {
        console.error('Failed to call callback:', callbackError);
      }
      
      toast.success('Publicação aprovada com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Falha ao aprovar publicação');
      throw error;
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
          
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in overflow-auto bg-gradient-to-br from-white to-gray-50">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-3 sm:mb-4 md:mb-6 -ml-2 sm:ml-0 touch-target"
          size="sm"
        >
          <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Voltar ao Painel</span>
        </Button>

        {/* Approval Status Banner */}
        {isApproved && post.selected_template && (
          <div className={cn(
            "mb-4 sm:mb-6 p-4 sm:p-6 rounded-xl border-4 animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
            templateBadgeColors[post.selected_template as 'A' | 'B']
          )}>
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 mb-1">
                  ✓ PUBLICAÇÃO APROVADA
                </h3>
                <p className="text-sm sm:text-base opacity-90">
                  Template {post.selected_template} foi selecionado
                  {post.reviewed_at && (
                    <span className="ml-2 text-xs opacity-75">
                      • {formatDistanceToNow(new Date(post.reviewed_at), { addSuffix: true, locale: pt })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={scrollToTemplates}
              variant="secondary"
              className="gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/30 text-current shrink-0"
            >
              <Eye className="h-4 w-4" />
              Ver Template
            </Button>
          </div>
        )}

        <div className="mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">{post.tema}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isApproved ? 'Revisão da publicação aprovada' : 'Selecione o seu modelo preferido e reveja o conteúdo'}
          </p>
        </div>

        {/* Templates - Side by side on desktop, stacked on mobile */}
        <div ref={templatesRef} className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-3 sm:mb-4 md:mb-6 max-w-5xl mx-auto">
          <div className="w-full max-w-md mx-auto">
            <CarouselPreview
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

        {/* Caption and Hashtags Editor */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          {isApproved ? (
            <div className="rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 md:p-5">
              <Label className="text-xs sm:text-sm md:text-base font-semibold mb-2 block flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Caption e Hashtags (Modo Leitura)
              </Label>
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm whitespace-pre-wrap mb-3">{caption}</p>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <CaptionEditor
              initialCaption={post.caption}
              initialHashtags={post.hashtags || []}
              onChange={(newCaption, newHashtags) => {
                setCaption(newCaption);
                setHashtags(newHashtags);
              }}
            />
          )}
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
            disabled={isApproved}
          />
        </div>
          </main>

          {!isApproved && (
            <ActionBar
              canApprove={!!selectedTemplate}
              onApprove={handleApprove}
              onReject={handleReject}
              onSave={handleSave}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Review;
