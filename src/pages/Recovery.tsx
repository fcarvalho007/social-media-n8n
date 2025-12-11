import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Download, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  FileText,
  Image,
  Video,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FailedPost {
  id: string;
  tema: string;
  caption: string;
  caption_edited: string | null;
  media_items: any[];
  template_a_images: string[];
  error_log: string | null;
  failed_at: string | null;
  status: string;
  post_type: string;
  selected_networks: string[];
  scheduled_date: string | null;
  created_at: string;
}

const Recovery = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<FailedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPost();
    }
  }, [token]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('recovery_token', token)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Link de recuperação inválido ou expirado');
        return;
      }

      setPost(data as FailedPost);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Erro ao carregar publicação');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!post) return;
    
    setDownloading(true);
    try {
      const zip = new JSZip();
      
      // Add caption as text file
      const captionText = post.caption_edited || post.caption;
      zip.file('caption.txt', captionText);
      
      // Get all media URLs
      const mediaUrls: string[] = [];
      
      if (post.media_items && Array.isArray(post.media_items)) {
        post.media_items.forEach((item: any) => {
          if (item.url) mediaUrls.push(item.url);
        });
      }
      
      if (post.template_a_images && Array.isArray(post.template_a_images)) {
        post.template_a_images.forEach((url: string) => {
          if (!mediaUrls.includes(url)) mediaUrls.push(url);
        });
      }

      // Download and add each media file
      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i];
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
          zip.file(`media_${i + 1}.${extension}`, blob);
        } catch (err) {
          console.error(`Failed to download: ${url}`, err);
        }
      }

      // Add metadata
      const metadata = {
        post_id: post.id,
        tema: post.tema,
        post_type: post.post_type,
        networks: post.selected_networks,
        scheduled_date: post.scheduled_date,
        error: post.error_log,
        failed_at: post.failed_at,
        exported_at: new Date().toISOString(),
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `publicacao_${post.id.slice(0, 8)}.zip`);
      
      toast.success('Ficheiros descarregados com sucesso');
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.error('Erro ao criar ficheiro ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCaption = () => {
    if (!post) return;
    
    const caption = post.caption_edited || post.caption;
    navigator.clipboard.writeText(caption);
    toast.success('Legenda copiada para o clipboard');
  };

  const handleRetry = async () => {
    if (!post) return;
    
    setRetrying(true);
    try {
      // Reset status to approved for retry
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'approved',
          error_log: null,
          failed_at: null,
          retry_count: (post as any).retry_count ? (post as any).retry_count + 1 : 1
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Publicação marcada para nova tentativa');
      navigate('/pending');
    } catch (error) {
      console.error('Error retrying:', error);
      toast.error('Erro ao tentar novamente');
    } finally {
      setRetrying(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!post) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
          error_log: `Resolvido manualmente: ${post.error_log}`
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Publicação marcada como resolvida');
      navigate('/calendar');
    } catch (error) {
      console.error('Error marking resolved:', error);
      toast.error('Erro ao marcar como resolvida');
    }
  };

  const getMediaIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return <FileText className="h-4 w-4" />;
    if (lower.match(/\.(mp4|mov|webm|avi)/)) return <Video className="h-4 w-4" />;
    return <Image className="h-4 w-4" />;
  };

  const getAllMediaUrls = (): string[] => {
    if (!post) return [];
    const urls: string[] = [];
    
    if (post.media_items && Array.isArray(post.media_items)) {
      post.media_items.forEach((item: any) => {
        if (item.url) urls.push(item.url);
      });
    }
    
    if (post.template_a_images && Array.isArray(post.template_a_images)) {
      post.template_a_images.forEach((url: string) => {
        if (!urls.includes(url)) urls.push(url);
      });
    }
    
    return urls;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A carregar publicação...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido ou já expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mediaUrls = getAllMediaUrls();
  const caption = post.caption_edited || post.caption;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Recuperar Publicação</h1>
            <p className="text-muted-foreground">
              Descarrega os ficheiros ou tenta publicar novamente
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-lg text-destructive">Erro na Publicação</CardTitle>
                <CardDescription className="mt-2 font-mono text-sm whitespace-pre-wrap break-words">
                  {post.error_log || 'Erro desconhecido'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Post Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tema</p>
                <p className="font-medium">{post.tema}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                <Badge variant="secondary">{post.post_type}</Badge>
              </div>

              {post.selected_networks && post.selected_networks.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Redes</p>
                  <div className="flex flex-wrap gap-1">
                    {post.selected_networks.map((network) => (
                      <Badge key={network} variant="outline">{network}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {post.scheduled_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Agendado: {new Date(post.scheduled_date).toLocaleDateString('pt-PT')}</span>
                </div>
              )}

              {post.failed_at && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <Clock className="h-4 w-4" />
                  <span>Falhou: {new Date(post.failed_at).toLocaleString('pt-PT')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Caption Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Legenda</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopyCaption}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{caption}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Media Preview */}
        {mediaUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Média ({mediaUrls.length} ficheiros)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square bg-muted rounded-lg overflow-hidden">
                    {url.toLowerCase().match(/\.(mp4|mov|webm|avi)/) ? (
                      <video 
                        src={url} 
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : url.toLowerCase().includes('.pdf') ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                    ) : (
                      <img 
                        src={url} 
                        alt={`Media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      {getMediaIcon(url)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações</CardTitle>
            <CardDescription>
              Escolhe como queres resolver esta publicação falhada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button 
                onClick={handleDownloadZip} 
                disabled={downloading}
                className="w-full"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descarregar ZIP
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCopyCaption}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Legenda
              </Button>
              
              <Button 
                variant="secondary"
                onClick={handleRetry}
                disabled={retrying}
                className="w-full"
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Tentar Novamente
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleMarkResolved}
                className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar Resolvido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Recovery;
