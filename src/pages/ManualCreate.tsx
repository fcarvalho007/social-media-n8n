import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { ModeBadge } from '@/components/ModeBadge';
import { DevHelper } from '@/components/DevHelper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Send, Calendar as CalendarIcon, ArrowLeft, Instagram, Linkedin, Upload, Clock, X, FileText, Loader2, Rocket, Smile, Bookmark, Sparkles, Youtube, Facebook } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import InstagramCarouselPreview from '@/components/manual-post/InstagramCarouselPreview';
import InstagramStoryPreview from '@/components/manual-post/InstagramStoryPreview';
import InstagramReelPreview from '@/components/manual-post/InstagramReelPreview';
import LinkedInPreview from '@/components/manual-post/LinkedInPreview';
import YouTubeShortsPreview from '@/components/manual-post/YouTubeShortsPreview';
import YouTubeVideoPreview from '@/components/manual-post/YouTubeVideoPreview';
import TikTokPreview from '@/components/manual-post/TikTokPreview';
import FacebookPreview from '@/components/manual-post/FacebookPreview';
import DraftsDialog from '@/components/manual-post/DraftsDialog';
import SavedCaptionsDialog from '@/components/manual-post/SavedCaptionsDialog';
import AICaptionDialog from '@/components/manual-post/AICaptionDialog';
import { NetworkFormatSelector } from '@/components/manual-post/NetworkFormatSelector';
import { getMediaRequirements, validateAllFormats, getValidationSummary, FormatValidationResult } from '@/lib/formatValidation';
import { INSTAGRAM_CONFIG, LINKEDIN_CONFIG } from '@/types/publishing';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

export default function ManualCreate() {
  const navigate = useNavigate();
  const [selectedFormats, setSelectedFormats] = useState<PostFormat[]>([]);
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [time, setTime] = useState('12:00');
  const [scheduleAsap, setScheduleAsap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [savedCaptionsOpen, setSavedCaptionsOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute media requirements based on selected formats
  const mediaRequirements = useMemo(() => getMediaRequirements(selectedFormats), [selectedFormats]);

  // Compute validations
  const validations = useMemo(() => {
    if (selectedFormats.length === 0) return {} as Record<PostFormat, FormatValidationResult>;
    return validateAllFormats(selectedFormats, caption, mediaFiles);
  }, [selectedFormats, caption, mediaFiles]);

  const validationSummary = useMemo(() => getValidationSummary(validations), [validations]);

  // Handle emoji insertion
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCaption = caption.slice(0, start) + emoji + caption.slice(end);
      
      if (newCaption.length <= mediaRequirements.maxCaptionLength) {
        setCaption(newCaption);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
      }
    } else {
      const newCaption = caption + emoji;
      if (newCaption.length <= mediaRequirements.maxCaptionLength) {
        setCaption(newCaption);
      }
    }
    setEmojiPickerOpen(false);
  };

  const maxLength = mediaRequirements.maxCaptionLength;
  const captionLength = caption.length;

  // Get unique networks from selected formats
  const selectedNetworks = useMemo(() => {
    const networks = new Set(selectedFormats.map(f => getNetworkFromFormat(f)));
    return Array.from(networks);
  }, [selectedFormats]);

  // Update active preview tab when formats change
  useMemo(() => {
    if (selectedFormats.length > 0 && !activePreviewTab) {
      setActivePreviewTab(selectedFormats[0]);
    } else if (selectedFormats.length === 0) {
      setActivePreviewTab('');
    } else if (!selectedFormats.includes(activePreviewTab as PostFormat)) {
      setActivePreviewTab(selectedFormats[0]);
    }
  }, [selectedFormats]);

  // Validations
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (selectedFormats.length === 0) {
      errors.push('Selecione pelo menos um formato');
    }
    
    // Check media requirements
    const imageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
    const videoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;
    const totalMedia = imageCount + videoCount;
    
    if (mediaRequirements.minMedia > 0 && totalMedia < mediaRequirements.minMedia) {
      errors.push(`Mínimo ${mediaRequirements.minMedia} ficheiro(s)`);
    }
    
    if (totalMedia > mediaRequirements.maxMedia) {
      errors.push(`Máximo ${mediaRequirements.maxMedia} ficheiro(s)`);
    }
    
    if (mediaRequirements.requiresVideo && videoCount === 0) {
      errors.push('Formato selecionado requer vídeo');
    }
    
    // Check if LinkedIn is selected and caption is empty
    if (selectedNetworks.includes('linkedin') && !caption.trim()) {
      errors.push('Legenda obrigatória para LinkedIn');
    }
    
    if (!scheduleAsap && scheduledDate) {
      const selectedDateTime = new Date(scheduledDate);
      if (time) {
        const [hours, minutes] = time.split(':');
        selectedDateTime.setHours(parseInt(hours), parseInt(minutes));
      }
      if (selectedDateTime < new Date()) {
        errors.push('Data/hora não pode estar no passado');
      }
    }
    
    return errors;
  };

  const validationErrors = getValidationErrors();
  const hasErrors = validationErrors.length > 0;

  // Handle media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > mediaRequirements.maxMedia) {
      toast.error(`Máximo ${mediaRequirements.maxMedia} ficheiros`);
      return;
    }

    // Validate file sizes
    const maxSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      toast.error('Ficheiros não podem exceder 50MB');
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!mediaRequirements.requiresImage) {
      validTypes.push('video/mp4');
    }
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      toast.error('Formato não suportado. Use PNG, JPG ou MP4');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    const urls = files.map(file => URL.createObjectURL(file));
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 50);

    setMediaFiles(files);
    setMediaPreviewUrls(urls);
    
    toast.success(`${files.length} ficheiro(s) carregado(s)`);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveDraft = async () => {
    if (selectedFormats.length === 0) {
      toast.error('Selecione pelo menos um formato');
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tem de iniciar sessão');
        return;
      }

      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        setUploadProgress(Math.round((i / totalFiles) * 100));
        
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
        
        mediaUrls.push(publicUrl);
      }

      setUploadProgress(100);

      // Save primary format for backwards compatibility
      const primaryFormat = selectedFormats[0];
      let platform: string;
      if (primaryFormat.startsWith('instagram_')) platform = 'instagram_carrousel';
      else if (primaryFormat.startsWith('linkedin_')) platform = 'linkedin';
      else platform = primaryFormat;

      const draftData = {
        user_id: user.id,
        platform,
        caption,
        media_urls: mediaUrls,
        scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
        scheduled_time: time || null,
        publish_immediately: scheduleAsap,
        status: 'draft',
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from('posts_drafts')
          .update(draftData)
          .eq('id', currentDraftId);
        if (error) throw error;
        toast.success('Rascunho atualizado com sucesso');
      } else {
        const { error } = await supabase.from('posts_drafts').insert(draftData);
        if (error) throw error;
        toast.success('Rascunho guardado com sucesso');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Erro ao guardar rascunho. Tente novamente.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleLoadDraft = (draft: any) => {
    // Map platform back to format
    let format: PostFormat;
    if (draft.platform === 'instagram_carrousel') format = 'instagram_carousel';
    else if (draft.platform === 'instagram_stories') format = 'instagram_stories';
    else if (draft.platform === 'linkedin') format = 'linkedin_post';
    else format = 'instagram_carousel';

    setSelectedFormats([format]);
    setCaption(draft.caption || '');
    setMediaPreviewUrls(draft.media_urls || []);
    setScheduleAsap(draft.publish_immediately);
    
    if (draft.scheduled_date) {
      setScheduledDate(new Date(draft.scheduled_date));
    }
    if (draft.scheduled_time) {
      setTime(draft.scheduled_time);
    }

    setCurrentDraftId(draft.id);
  };

  const handleSubmitForApproval = async () => {
    if (hasErrors) {
      const errorMsg = validationErrors.join(', ');
      toast.error(`Corrija os erros: ${errorMsg}`, { duration: 5000 });
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Tem de iniciar sessão para submeter.');
        return;
      }

      toast.loading('A carregar ficheiros...', { id: 'upload' });
      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        setUploadProgress(Math.round((i / totalFiles) * 50));
        
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) {
          toast.dismiss('upload');
          throw new Error(`Erro ao carregar ${file.name}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
        
        mediaUrls.push(publicUrl);
      }

      toast.dismiss('upload');
      setUploadProgress(50);

      // Map formats to platform for N8N
      const primaryFormat = selectedFormats[0];
      let platform: string;
      if (primaryFormat.startsWith('instagram_')) platform = 'instagram_carousel';
      else if (primaryFormat.startsWith('linkedin_')) platform = 'linkedin';
      else if (primaryFormat.startsWith('youtube_')) platform = 'youtube';
      else if (primaryFormat.startsWith('tiktok_')) platform = 'tiktok';
      else if (primaryFormat.startsWith('facebook_')) platform = 'facebook';
      else platform = 'instagram_carousel';

      let scheduledDateStr = '';
      let scheduledTimeStr = '';
      
      if (!scheduleAsap && scheduledDate) {
        scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');
        scheduledTimeStr = time;
      }

      setUploadProgress(60);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }
      
      toast.loading('A submeter publicação...', { id: 'submit' });
      setUploadProgress(80);
      
      const { data, error } = await supabase.functions.invoke('submit-to-n8n', {
        body: {
          platform,
          caption,
          media_urls: mediaUrls,
          scheduled_date: scheduledDateStr || undefined,
          scheduled_time: scheduledTimeStr || undefined,
          publish_immediately: scheduleAsap,
          formats: selectedFormats,
        },
      });

      if (error) {
        toast.dismiss('submit');
        throw new Error('Erro ao comunicar com o servidor');
      }

      if (!data?.success) {
        toast.dismiss('submit');
        throw new Error(data?.error || 'Falha ao submeter para aprovação');
      }

      toast.dismiss('submit');
      setUploadProgress(90);

      const postData = {
        user_id: user.id,
        post_type: primaryFormat.includes('carousel') ? 'carousel' : primaryFormat.includes('video') || primaryFormat.includes('reel') ? 'video' : 'image',
        selected_networks: selectedNetworks as any,
        caption,
        scheduled_date: scheduledDate?.toISOString() || null,
        schedule_asap: scheduleAsap,
        status: 'waiting_for_approval',
        origin_mode: 'manual',
        tema: 'Manual post',
        template_a_images: mediaUrls,
        template_b_images: [],
        workflow_id: 'manual-' + Date.now(),
      };

      const { error: dbError } = await supabase.from('posts').insert(postData);
      if (dbError) console.error('DB insert error:', dbError);

      setUploadProgress(100);
      
      toast.success('Publicação submetida para aprovação com sucesso!', { duration: 4000 });
      
      if (!currentDraftId) {
        setCaption('');
        setMediaFiles([]);
        setMediaPreviewUrls([]);
        setScheduledDate(undefined);
        setTime('12:00');
        setScheduleAsap(false);
      }
      
      setTimeout(() => navigate('/calendar'), 1500);
    } catch (error) {
      console.error('Error submitting:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao submeter. Tente novamente.';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handlePublishNow = async () => {
    if (hasErrors) {
      const errorMsg = validationErrors.join(', ');
      toast.error(`Corrija os erros: ${errorMsg}`, { duration: 5000 });
      return;
    }

    // Check for unsupported formats
    const unsupportedFormats = selectedFormats.filter(f => 
      f.includes('stories') || f.includes('reel') || f.includes('tiktok') || f.includes('youtube')
    );
    
    if (unsupportedFormats.length > 0) {
      toast.error('Alguns formatos não suportam publicação direta. Use "Submeter" para aprovação.', { duration: 5000 });
      return;
    }

    try {
      setPublishing(true);
      setUploadProgress(0);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Tem de iniciar sessão para publicar.');
        return;
      }

      toast.loading('A carregar ficheiros...', { id: 'publish-upload' });
      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        setUploadProgress(Math.round((i / totalFiles) * 40));

        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);

        if (uploadError) {
          toast.dismiss('publish-upload');
          throw new Error(`Erro ao carregar ${file.name}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      toast.dismiss('publish-upload');
      setUploadProgress(50);

      // Publish to each supported platform
      const primaryFormat = selectedFormats[0];
      const platform = primaryFormat.startsWith('linkedin_') ? 'linkedin' : 'instagram';
      const postId = `manual-${Date.now()}`;

      const publishPayload: Record<string, any> = {
        post_id: postId,
        images: mediaUrls,
      };

      if (platform === 'instagram') {
        publishPayload.caption_final = caption;
        publishPayload.account_id = INSTAGRAM_CONFIG.accountId;
      } else {
        publishPayload.body_final = caption;
        publishPayload.member_urn = LINKEDIN_CONFIG.memberUrn;
      }

      toast.loading('A publicar...', { id: 'publish-now' });
      setUploadProgress(70);

      const { data: publishResult, error: publishError } = await supabase.functions.invoke('publish-proxy', {
        body: {
          platform,
          ...publishPayload,
        },
      });

      if (publishError) {
        toast.dismiss('publish-now');
        throw new Error('Erro ao comunicar com o servidor de publicação');
      }

      if (!publishResult?.success) {
        toast.dismiss('publish-now');
        throw new Error(publishResult?.error || 'Falha ao publicar');
      }

      toast.dismiss('publish-now');
      setUploadProgress(85);

      const postData = {
        user_id: user.id,
        post_type: primaryFormat.includes('carousel') ? 'carousel' : 'text',
        selected_networks: [platform] as any,
        caption,
        scheduled_date: new Date().toISOString(),
        schedule_asap: true,
        status: 'published',
        origin_mode: 'manual',
        tema: 'Manual post',
        template_a_images: mediaUrls,
        template_b_images: [],
        workflow_id: postId,
        published_at: new Date().toISOString(),
        publish_metadata: {
          published_via: 'manual_create',
          platform,
          result: publishResult,
        },
      };

      const { error: dbError } = await supabase.from('posts').insert(postData);
      if (dbError) console.error('[ManualCreate] DB insert error:', dbError);

      setUploadProgress(95);

      try {
        await supabase.functions.invoke('increment-quota', {
          body: {
            platform,
            post_type: primaryFormat.includes('carousel') ? 'carousel' : 'post',
          },
        });
      } catch (quotaErr) {
        console.warn('[ManualCreate] Quota increment failed:', quotaErr);
      }

      setUploadProgress(100);

      toast.success('Publicação enviada com sucesso!', { duration: 4000 });

      setCaption('');
      setMediaFiles([]);
      setMediaPreviewUrls([]);
      setScheduledDate(undefined);
      setTime('12:00');
      setScheduleAsap(false);
      setCurrentDraftId(null);
      setSelectedFormats([]);

      setTimeout(() => navigate('/calendar'), 1500);
    } catch (error) {
      console.error('[ManualCreate] Publish error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao publicar. Tente novamente.';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setPublishing(false);
      setUploadProgress(0);
    }
  };

  // Get accept types for file input
  const getAcceptTypes = () => {
    if (mediaRequirements.requiresVideo) return 'video/*';
    if (mediaRequirements.requiresImage) return 'image/*';
    return 'image/*,video/*';
  };

  // Render preview for a format
  const renderPreview = (format: PostFormat) => {
    const network = getNetworkFromFormat(format);
    
    if (network === 'instagram') {
      if (format === 'instagram_stories') {
        return <InstagramStoryPreview mediaUrl={mediaPreviewUrls[0]} aspectRatioValid={true} />;
      }
      if (format === 'instagram_reel') {
        return <InstagramReelPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
      }
      return <InstagramCarouselPreview mediaUrls={mediaPreviewUrls} caption={caption} />;
    }
    
    if (network === 'linkedin') {
      return <LinkedInPreview mediaUrls={mediaPreviewUrls} caption={caption} />;
    }
    
    if (network === 'youtube') {
      if (format === 'youtube_shorts') {
        return <YouTubeShortsPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
      }
      return <YouTubeVideoPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
    }
    
    if (network === 'tiktok') {
      return <TikTokPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
    }
    
    if (network === 'facebook') {
      return <FacebookPreview 
        mediaUrls={mediaPreviewUrls} 
        caption={caption} 
        format={format as 'facebook_image' | 'facebook_stories' | 'facebook_reel'} 
      />;
    }
    
    // Default preview for any other formats
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground mb-2">Pré-visualização: {getFormatConfig(format)?.label}</p>
        {mediaPreviewUrls.length > 0 && (
          <img src={mediaPreviewUrls[0]} alt="Preview" className="rounded-lg max-h-64 mx-auto" />
        )}
        {caption && <p className="mt-3 text-sm whitespace-pre-wrap">{caption}</p>}
      </div>
    );
  };

  // Get icon for network
  const getNetworkIcon = (network: string) => {
    switch (network) {
      case 'instagram': return Instagram;
      case 'linkedin': return Linkedin;
      case 'youtube': return Youtube;
      case 'facebook': return Facebook;
      default: return FileText;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 bg-gradient-to-br from-background to-background-secondary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/?tab=create')}
          className="gap-2"
          aria-label="Voltar à página anterior"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <ModeBadge mode="manual" onChangeMode={() => navigate('/?tab=create')} className="flex-1" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left - Form */}
        <div className="space-y-6">
          {/* Network & Format Selection */}
          <NetworkFormatSelector
            selectedFormats={selectedFormats}
            onFormatsChange={setSelectedFormats}
          />

          {/* Media Upload */}
          {selectedFormats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Média</CardTitle>
                <CardDescription>
                  {mediaRequirements.requiresVideo 
                    ? `Carregue ${mediaRequirements.minMedia} vídeo (MP4 - máx. 50MB)`
                    : `Carregue entre ${mediaRequirements.minMedia} e ${mediaRequirements.maxMedia} ficheiros (PNG, JPG${!mediaRequirements.requiresImage ? ', MP4' : ''} - máx. 50MB cada)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label 
                  htmlFor="media-upload" 
                  className={cn(
                    "cursor-pointer",
                    (saving || submitting || isUploading) && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/30">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground">A processar ficheiros...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">Carregar ficheiros</span>
                        <span className="text-xs text-muted-foreground">Arraste ou clique para selecionar</span>
                      </>
                    )}
                  </div>
                  <Input
                    id="media-upload"
                    type="file"
                    multiple={mediaRequirements.maxMedia > 1}
                    accept={getAcceptTypes()}
                    onChange={handleMediaUpload}
                    disabled={saving || submitting || isUploading}
                    className="hidden"
                    aria-label="Carregar ficheiros de média"
                  />
                </Label>

                {isUploading && <Progress value={uploadProgress} className="h-2" />}
                
                {mediaPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mediaPreviewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        <img 
                          src={url} 
                          alt={`Pré-visualização ${idx + 1} de ${mediaPreviewUrls.length}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          disabled={saving || submitting}
                          aria-label={`Remover imagem ${idx + 1}`}
                          className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs">
                          {idx + 1}/{mediaPreviewUrls.length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Caption */}
          {selectedFormats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Legenda</CardTitle>
                <CardDescription>
                  <span className={cn(
                    "font-medium",
                    captionLength > maxLength * 0.9 && captionLength <= maxLength && "text-orange-500",
                    captionLength > maxLength && "text-destructive"
                  )}>
                    {captionLength}/{maxLength}
                  </span>
                  {' '}caracteres
                  {selectedNetworks.includes('linkedin') && ' (obrigatório para LinkedIn)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Caption Toolbar */}
                <div className="flex items-center gap-1 border rounded-lg p-1.5 bg-muted/30">
                  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Inserir emoji">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0" align="start">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={320}
                        height={400}
                        searchPlaceholder="Pesquisar emoji..."
                        previewConfig={{ showPreview: false }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setSavedCaptionsOpen(true)}
                    title="Legendas guardadas"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Guardadas</span>
                  </Button>

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20"
                    onClick={() => setAiDialogOpen(true)}
                    title="Melhorar com IA"
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium">IA</span>
                  </Button>
                </div>

                <Textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, maxLength))}
                  placeholder="Escreva a sua legenda..."
                  disabled={saving || submitting || publishing}
                  className="min-h-[150px] resize-none"
                  aria-label="Legenda da publicação"
                />
              </CardContent>
            </Card>
          )}

          {/* Date & Time */}
          {selectedFormats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Agendamento</CardTitle>
                <CardDescription>Defina quando publicar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="asap" className="text-sm font-medium">Logo que possível</Label>
                  <Switch id="asap" checked={scheduleAsap} onCheckedChange={setScheduleAsap} />
                </div>
                
                {!scheduleAsap && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'dd/MM/yyyy', { locale: pt }) : 'Selecione a data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label htmlFor="time" className="text-sm">Hora</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {selectedFormats.length > 0 && (
            <Card className="lg:sticky lg:bottom-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg">
              <CardContent className="pt-6 space-y-3">
                {(saving || submitting || publishing) && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {saving ? 'A guardar...' : publishing ? 'A publicar...' : 'A submeter...'}
                      </span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {validationErrors.length > 0 && (
                  <div className="space-y-1" role="alert" aria-live="polite">
                    {validationErrors.map((error, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs block">
                        {error}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    type="button"
                    onClick={handlePublishNow}
                    disabled={publishing || submitting || saving || hasErrors || isUploading}
                    className="font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    aria-label="Publicar agora"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A publicar...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Publicar Agora
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving || submitting || publishing || selectedFormats.length === 0 || isUploading}
                    className="font-semibold"
                    aria-label="Guardar como rascunho"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Rascunho
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSubmitForApproval}
                    disabled={submitting || saving || publishing || hasErrors || isUploading}
                    className="font-semibold"
                    aria-label="Submeter para aprovação"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A submeter...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submeter
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftsDialogOpen(true)}
                    disabled={saving || submitting}
                    className="w-full text-xs"
                    aria-label="Ver rascunhos guardados"
                  >
                    <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                    Ver rascunhos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/calendar')}
                    disabled={saving || submitting}
                    className="w-full text-xs"
                    aria-label="Ver calendário de publicações"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                    Ver calendário
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right - Preview */}
        <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-auto">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>Como ficará a sua publicação</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFormats.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  Selecione um formato para ver a pré-visualização
                </div>
              ) : selectedFormats.length === 1 ? (
                <>
                  {renderPreview(selectedFormats[0])}
                  {scheduledDate && !scheduleAsap && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 justify-center">
                      <Clock className="h-3 w-3" />
                      <span>Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}</span>
                    </div>
                  )}
                </>
              ) : (
                <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab}>
                  <TabsList className="w-full mb-4">
                    {selectedFormats.map(format => {
                      const network = getNetworkFromFormat(format);
                      const Icon = getNetworkIcon(network);
                      const config = getFormatConfig(format);
                      return (
                        <TabsTrigger key={format} value={format} className="flex-1 gap-1.5">
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline text-xs">{config?.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {selectedFormats.map(format => (
                    <TabsContent key={format} value={format}>
                      {renderPreview(format)}
                    </TabsContent>
                  ))}
                  {scheduledDate && !scheduleAsap && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 justify-center">
                      <Clock className="h-3 w-3" />
                      <span>Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}</span>
                    </div>
                  )}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DevHelper />
      
      <DraftsDialog
        open={draftsDialogOpen}
        onOpenChange={setDraftsDialogOpen}
        onLoadDraft={handleLoadDraft}
      />

      <SavedCaptionsDialog
        open={savedCaptionsOpen}
        onOpenChange={setSavedCaptionsOpen}
        currentCaption={caption}
        onSelectCaption={setCaption}
      />

      <AICaptionDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        currentCaption={caption}
        onApplyCaption={setCaption}
      />
    </div>
  );
}
