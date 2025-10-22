import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
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
  const { user } = useAuth();
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

  const handleApprove = async () => {
    try {
      const reviewedAt = new Date().toISOString();
      
      const updateData: any = {
        status: 'approved',
        caption,
        reviewed_at: reviewedAt,
        reviewed_by: user?.email || 'unknown',
      };

      const { error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Call edge function to notify N8N webhook for approved stories
      try {
        const { error: webhookError } = await supabase.functions.invoke('notify-story-approval', {
          body: {
            post_id: id,
            status: 'approved',
            caption_final: caption,
            reviewed_by: user?.email || 'unknown',
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
      
      toast.success('Story aprovado com sucesso!');
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
        reviewed_by: user?.email || 'unknown',
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
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <main className="container py-4 sm:py-8 px-3 sm:px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 sm:mb-6 -ml-2 sm:ml-0"
          size="sm"
        >
          <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Voltar ao Painel</span>
        </Button>

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">{story.tema || 'Story'}</h2>
            <Badge variant="outline" className="text-xs">Story</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Criado em: {new Date(story.created_at).toLocaleString('pt-PT')}
          </p>
          {story.titulo_slide && (
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Título:</strong> {story.titulo_slide}
            </p>
          )}
        </div>

        {/* Story Image Preview */}
        <div className="max-w-[90%] sm:max-w-[70%] md:max-w-[60%] mx-auto mb-6">
          <div className="relative rounded-lg overflow-hidden bg-muted aspect-[9/16] group cursor-zoom-in" onClick={() => setZoomImage(true)}>
            <img
              src={story.story_image_url}
              alt="Story preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Caption Editor */}
        <div className="rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 max-w-2xl mx-auto">
          <Label htmlFor="caption" className="text-sm sm:text-base font-semibold mb-2 block">
            Caption / Legenda
          </Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escreva a caption para o story..."
            className="min-h-[150px] text-sm sm:text-base"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {caption.length} caracteres
          </p>
        </div>
      </main>

      <ActionBar
        canApprove={true}
        onApprove={handleApprove}
        onReject={handleReject}
        onSave={handleSave}
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
