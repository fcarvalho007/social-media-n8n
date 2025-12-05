import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
// Layout handled by MainLayout
import { ActionBar } from '@/components/ActionBar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const ReviewStory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [zoomImage, setZoomImage] = useState(false);

  useEffect(() => {
    fetchStory();
  }, [id]);

  const fetchStory = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setStory(data);
      setCaption(data.caption || '');
    } catch (error) {
      console.error('Erro ao carregar story:', error);
      toast.error('Falha ao carregar story');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          caption,
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
    try {
      console.log('[APPROVE] Starting approval process for story:', id);
      const reviewedAt = new Date().toISOString();
      
      const updateData: any = {
        status: 'approved',
        caption,
        reviewed_at: reviewedAt,
        reviewed_by: 'user',
      };

      // If scheduled, save the date and don't call the webhook yet
      if (scheduledDate) {
        updateData.scheduled_date = scheduledDate.toISOString();
        console.log('[APPROVE] Scheduled approval for:', scheduledDate.toISOString());
      } else {
        console.log('[APPROVE] Immediate approval');
      }

      console.log('[APPROVE] Update data:', updateData);

      const { data, error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('[APPROVE] Update result:', { data, error });

      if (error) {
        console.error('[APPROVE] Update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[APPROVE] No data returned from update');
        throw new Error('Nenhum story foi atualizado');
      }

      console.log('[APPROVE] Story updated successfully:', data[0]);

      // Only call edge function to notify N8N webhook if not scheduled
      if (!scheduledDate) {
        try {
          const { error: webhookError } = await supabase.functions.invoke('notify-story-approval', {
            body: {
              post_id: id,
              status: 'approved',
              caption_final: caption,
              reviewed_by: 'user',
              reviewed_at: reviewedAt,
            },
          });

          if (webhookError) {
            console.error('Webhook notification error:', webhookError);
            toast.error('Aprovado localmente, mas falha ao notificar n8n');
          }
        } catch (webhookError) {
          console.error('Failed to call webhook notification:', webhookError);
          toast.error('Aprovado localmente, mas falha ao notificar n8n');
        }
      }
      
      const successMessage = scheduledDate 
        ? 'Story agendado com sucesso!' 
        : 'Story aprovado com sucesso!';
      toast.success(successMessage);
      navigate('/');
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Falha ao aprovar story');
      throw error;
    }
  };

  const handleReject = async (rejectNotes?: string) => {
    try {
      const updateData: any = {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'user',
      };

      const { error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Story rejeitado');
      navigate('/');
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Falha ao rejeitar story');
      throw error;
    }
  };

  const handleRevertToPending = async () => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          status: 'pending',
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Story voltou para pendentes');
      navigate('/');
    } catch (error) {
      console.error('Erro ao voltar para pendentes:', error);
      toast.error('Falha ao voltar para pendentes');
    }
  };

  const isApproved = story?.status === 'approved' || story?.status === 'published';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return null;
  }

  return (
    <div className="pb-20">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-3 h-9 px-3 -ml-3"
        size="sm"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        <span className="text-xs sm:text-sm">Voltar ao Painel</span>
      </Button>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{story.tema || 'Story'}</h2>
          <Badge variant="outline" className="text-xs h-5">story</Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Criado em: {new Date(story.created_at).toLocaleString('pt-PT')}</p>
          {story.titulo_slide && (
            <p><strong>Título:</strong> {story.titulo_slide}</p>
          )}
        </div>
      </div>

      {/* Story Image Preview */}
      <div className="max-w-[85%] sm:max-w-[480px] md:max-w-[420px] lg:max-w-[400px] mx-auto mb-5">
        <div 
          className="relative rounded-xl overflow-hidden bg-muted aspect-[9/16] group cursor-zoom-in shadow-lg hover:shadow-xl touch-feedback active:scale-[0.98] transition-all" 
          onClick={() => setZoomImage(true)}
        >
          <img
            src={story.story_image_url}
            alt="Story preview"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-10 h-10 sm:w-12 sm:h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Caption Editor */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 mb-5 max-w-2xl mx-auto shadow-sm">
        <Label htmlFor="caption" className="text-sm font-semibold mb-2 block">
          Caption / Legenda
        </Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva a caption para o story..."
          className="min-h-[150px] text-sm leading-relaxed"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {caption.length} caracteres
        </p>
      </div>

      <ActionBar
        canApprove={true}
        isApproved={isApproved}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevertToPending={handleRevertToPending}
        onSave={handleSave}
        publishTargets={{ instagram: true, linkedin: true }}
        validations={{ instagram: { valid: true, errors: [], warnings: [] } }}
        contentType="story"
        mediaCount={1}
      />

      <Dialog open={zoomImage} onOpenChange={setZoomImage}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4 bg-background z-[60]">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualizar story</DialogTitle>
            <DialogDescription>Ampliação da imagem do story</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full">
            <img
              src={story.story_image_url}
              alt="Story preview - Zoom"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewStory;
