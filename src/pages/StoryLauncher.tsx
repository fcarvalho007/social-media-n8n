import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clipboard, Download, ExternalLink, Instagram, Link2, Loader2, SkipForward, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import InstagramStoryPreview from '@/components/manual-post/InstagramStoryPreview';
import { cn } from '@/lib/utils';

type StoryLinkPublication = {
  id: string;
  media_url: string;
  media_type: string;
  link_url: string;
  sticker_text: string | null;
  overlay_text: string | null;
  status: string;
};

type StepKey = 'download' | 'instagram' | 'sticker';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

const vibrate = (pattern: VibratePattern) => {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
};

export default function StoryLauncher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<StoryLinkPublication | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [skipOpen, setSkipOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const launcherUrl = useMemo(() => window.location.href, []);
  const mobile = isMobile();

  useEffect(() => {
    let cancelled = false;
    const loadStory = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('story_link_publications')
        .select('id,media_url,media_type,link_url,sticker_text,overlay_text,status')
        .eq('id', id)
        .maybeSingle();
      if (!cancelled) {
        if (error || !data) toast.error('Não foi possível abrir este pacote de Story.');
        setStory((data as StoryLinkPublication) ?? null);
        setLoading(false);
      }
    };
    loadStory();
    return () => { cancelled = true; };
  }, [id]);

  const copyLink = useCallback(async (silent = false) => {
    if (!story?.link_url) return false;
    try {
      await navigator.clipboard.writeText(story.link_url);
      setCopied(true);
      vibrate(10);
      if (!silent) toast.success('Link copiado.');
      window.setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      if (!silent) toast.error('Não foi possível copiar automaticamente. Usa o botão para copiar.');
      return false;
    }
  }, [story?.link_url]);

  useEffect(() => {
    if (story?.link_url) void copyLink(true);
  }, [story?.link_url, copyLink]);

  useEffect(() => {
    const onFocus = () => {
      if (story?.link_url) toast('O link ainda está pronto para copiar. Se já publicaste, confirma abaixo.');
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [story?.link_url]);

  const markStep = (step: StepKey) => setCompletedSteps(prev => new Set([...prev, step]));

  const downloadMedia = () => {
    if (!story) return;
    const extension = story.media_type === 'video' ? 'mp4' : 'jpg';
    const anchor = document.createElement('a');
    anchor.href = story.media_url;
    anchor.download = `story-com-link.${extension}`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    markStep('download');
    vibrate([10, 50, 10]);
    toast.success(story.media_type === 'video' ? 'Vídeo descarregado.' : 'Imagem guardada na galeria.');
  };

  const openInstagram = () => {
    markStep('instagram');
    void copyLink(true);
    const fallback = 'https://www.instagram.com/';
    if (isIOS()) {
      window.location.href = 'instagram://story-camera';
      window.setTimeout(() => { window.location.href = 'instagram://app'; }, 900);
      return;
    }
    if (isAndroid()) {
      window.location.href = 'intent://story-camera#Intent;package=com.instagram.android;scheme=instagram;end';
      return;
    }
    window.open(fallback, '_blank', 'noopener,noreferrer');
  };

  const updateStatus = async (status: 'published' | 'skipped') => {
    if (!story) return;
    setUpdating(true);
    const patch = status === 'published'
      ? { status, published_at: new Date().toISOString(), published_by_device: isAndroid() ? 'android' : isIOS() ? 'ios' : 'web', last_error: null }
      : { status, last_error: null };
    const { error } = await supabase.from('story_link_publications').update(patch as any).eq('id', story.id);
    setUpdating(false);
    if (error) {
      toast.error('Não foi possível atualizar o estado da Story.');
      return;
    }
    setStory({ ...story, status });
    if (status === 'published') {
      vibrate([20, 100, 20, 100, 20]);
      toast.success('Story marcada como publicada.');
      setFeedbackOpen(true);
    } else {
      toast.success('Story marcada como pulada.');
      navigate('/publication-history');
    }
  };

  const StepState = ({ step }: { step: StepKey }) => completedSteps.has(step)
    ? <CheckCircle2 className="h-5 w-5 text-success" />
    : <span className="h-3 w-3 rounded-full bg-primary motion-safe:animate-pulse" />;

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  }

  if (!story) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">Pacote de Story não encontrado.</main>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 lg:grid lg:grid-cols-[minmax(260px,360px)_1fr] lg:items-start">
        <section className="space-y-4">
          <Badge variant="secondary" className="gap-2"><Instagram className="h-3.5 w-3.5" />Story com Link</Badge>
          <InstagramStoryPreview mediaUrl={story.media_url} aspectRatioValid isVideo={story.media_type === 'video'} linkUrl={story.link_url} stickerText={story.sticker_text ?? undefined} overlayText={story.overlay_text ?? undefined} />
        </section>

        <Card className="manual-card-shell border-2">
          <CardContent className="manual-card-content space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-normal">Publicar Story com Link</h1>
              <p className="text-sm text-muted-foreground">Guarda a média, abre o Instagram e cola o link no sticker.</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-primary" />Link sticker</div>
              <p className="break-all text-sm text-muted-foreground">{story.link_url}</p>
              <Button type="button" variant="outline" className="mt-3 w-full gap-2" onClick={() => copyLink(false)}>
                <Clipboard className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </div>

            {!mobile && (
              <div className="rounded-lg border bg-muted/20 p-4 text-center">
                <QRCodeSVG value={launcherUrl} size={150} className="mx-auto rounded-md bg-background p-2" />
                <p className="mt-3 text-sm text-muted-foreground">Lê com o telemóvel para continuar lá.</p>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h2 className="text-base font-semibold">Segue estes 3 passos</h2>
              <div className="grid gap-2">
                <Button type="button" variant="outline" className="manual-touch-target justify-between" onClick={downloadMedia}>
                  <span className="flex items-center gap-2"><Download className="h-4 w-4" />Descarregar {story.media_type === 'video' ? 'vídeo' : 'imagem'}</span>
                  <StepState step="download" />
                </Button>
                {mobile && (
                  <Button type="button" variant="outline" className="manual-touch-target justify-between" onClick={openInstagram}>
                    <span className="flex items-center gap-2"><ExternalLink className="h-4 w-4" />Abrir no Instagram</span>
                    <StepState step="instagram" />
                  </Button>
                )}
                <Button type="button" variant="outline" className="manual-touch-target justify-between" onClick={() => { markStep('sticker'); void copyLink(true); }}>
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Colar link no sticker</span>
                  <StepState step="sticker" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Button type="button" className={cn('manual-touch-target gap-2', completedSteps.size >= 2 && 'shadow-lg')} onClick={() => updateStatus('published')} disabled={updating}>
                <CheckCircle2 className="h-4 w-4" />Já publiquei
              </Button>
              <Button type="button" variant="ghost" className="manual-touch-target gap-2 text-muted-foreground" onClick={() => setSkipOpen(true)} disabled={updating}>
                <SkipForward className="h-4 w-4" />Pular desta vez
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={skipOpen} onOpenChange={setSkipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pular esta Story?</AlertDialogTitle>
            <AlertDialogDescription>O conteúdo fica guardado no histórico e pode ser consultado mais tarde.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateStatus('skipped')}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Correu bem?</AlertDialogTitle>
            <AlertDialogDescription>Este feedback ajuda a rever o fluxo em dispositivos reais.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/publication-history')}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/publication-history')}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
