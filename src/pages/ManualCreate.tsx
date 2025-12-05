import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MediaItem } from '@/types/social';
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
import { toast } from 'sonner';
import { Save, Send, Calendar as CalendarIcon, ArrowLeft, Instagram, Linkedin, Upload, Clock, X, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import InstagramCarouselPreview from '@/components/manual-post/InstagramCarouselPreview';
import InstagramStoryPreview from '@/components/manual-post/InstagramStoryPreview';
import LinkedInPreview from '@/components/manual-post/LinkedInPreview';
import DraftsDialog from '@/components/manual-post/DraftsDialog';

type NetworkType = 'instagram-carousel' | 'instagram-stories' | 'linkedin';

export default function ManualCreate() {
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType | null>(null);
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [time, setTime] = useState('12:00');
  const [scheduleAsap, setScheduleAsap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Character limits
  const getMaxCaptionLength = () => {
    if (selectedNetwork === 'instagram-carousel' || selectedNetwork === 'instagram-stories') return 2200;
    if (selectedNetwork === 'linkedin') return 3000;
    return 2200;
  };

  const maxLength = getMaxCaptionLength();
  const captionLength = caption.length;

  // Validations
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!selectedNetwork) {
      errors.push('Selecione uma rede social');
    }
    
    if (selectedNetwork === 'instagram-carousel') {
      if (mediaFiles.length < 1) errors.push('Mínimo 1 imagem');
      if (mediaFiles.length > 10) errors.push('Máximo 10 imagens');
    }
    
    if (selectedNetwork === 'instagram-stories') {
      if (mediaFiles.length !== 1) errors.push('Stories requer exatamente 1 imagem ou vídeo');
    }
    
    if (selectedNetwork === 'linkedin') {
      if (!caption.trim()) errors.push('Legenda obrigatória para LinkedIn');
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
    
    if (selectedNetwork === 'instagram-carousel' && files.length > 10) {
      toast.error('Máximo 10 imagens para carrossel');
      return;
    }
    
    if (selectedNetwork === 'instagram-stories' && files.length > 1) {
      toast.error('Stories permite apenas 1 ficheiro');
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
    if (selectedNetwork === 'instagram-stories') {
      validTypes.push('video/mp4');
    }
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      toast.error('Formato não suportado. Use PNG, JPG ou MP4');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress for preview generation
    const urls = files.map(file => URL.createObjectURL(file));
    
    // Animate progress
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
    if (!selectedNetwork) {
      toast.error('Selecione uma rede social');
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

      // Upload media files to storage
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

      // Map selectedNetwork to platform format
      let platform: string;
      if (selectedNetwork === 'instagram-carousel') platform = 'instagram_carrousel';
      else if (selectedNetwork === 'instagram-stories') platform = 'instagram_stories';
      else platform = 'linkedin';

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
        // Update existing draft
        const { error } = await supabase
          .from('posts_drafts')
          .update(draftData)
          .eq('id', currentDraftId);
        if (error) throw error;
        toast.success('Rascunho atualizado com sucesso');
      } else {
        // Insert new draft
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
    // Map platform back to NetworkType
    let network: NetworkType;
    if (draft.platform === 'instagram_carrousel') network = 'instagram-carousel';
    else if (draft.platform === 'instagram_stories') network = 'instagram-stories';
    else network = 'linkedin';

    setSelectedNetwork(network);
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
      toast.error(`Corrija os erros: ${errorMsg}`, {
        duration: 5000,
      });
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      
      // Check user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 DEBUG - User:', user ? { id: user.id, email: user.email } : null);
      console.log('🔐 DEBUG - Auth Error:', authError);
      
      if (authError || !user) {
        console.error('❌ Authentication failed:', authError);
        toast.error('Tem de iniciar sessão para submeter. Por favor, faça login novamente.', {
          duration: 5000,
        });
        return;
      }

      // Upload media to storage with progress
      toast.loading('A carregar ficheiros...', { id: 'upload' });
      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        setUploadProgress(Math.round((i / totalFiles) * 50)); // 0-50% for upload
        
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

      // Map selectedNetwork to platform format for N8N
      let platform: string;
      if (selectedNetwork === 'instagram-carousel') platform = 'instagram_carousel';
      else if (selectedNetwork === 'instagram-stories') platform = 'instagram_stories';
      else platform = 'linkedin';

      // Prepare scheduled date/time
      let scheduledDateStr = '';
      let scheduledTimeStr = '';
      
      if (!scheduleAsap && scheduledDate) {
        scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');
        scheduledTimeStr = time;
      }

      setUploadProgress(60);

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 DEBUG - Session:', session ? { 
        access_token: session.access_token ? '✅ Presente' : '❌ Ausente',
        expires_at: session.expires_at,
        user_id: session.user?.id 
      } : null);
      
      if (!session || !session.access_token) {
        console.error('❌ Sessão inválida:', session);
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      console.log('✅ Autenticação válida - A submeter para n8n...');
      
      // Call edge function to submit to N8N
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

      // Save to database
      const postData = {
        user_id: user.id,
        post_type: selectedNetwork === 'instagram-carousel' ? 'carousel' : selectedNetwork === 'instagram-stories' ? 'image' : 'text',
        selected_networks: [selectedNetwork!.split('-')[0]] as any,
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
      
      toast.success('Publicação submetida para aprovação com sucesso!', {
        duration: 4000,
      });
      
      // Clear form if it's a new draft (not updating)
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
      toast.error(errorMsg, {
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };


  const networkOptions: { value: NetworkType; label: string; icon: any; description: string }[] = [
    { value: 'instagram-carousel', label: 'Instagram Carrossel', icon: Instagram, description: '1-10 imagens' },
    { value: 'instagram-stories', label: 'Instagram Stories', icon: Instagram, description: '1 imagem ou vídeo' },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, description: 'Post com legenda' },
  ];

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
                  {/* Network Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rede Social</CardTitle>
                      <CardDescription>Selecione onde pretende publicar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {networkOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedNetwork(option.value)}
                          disabled={saving || submitting}
                          aria-label={`Selecionar ${option.label}`}
                          aria-pressed={selectedNetwork === option.value}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            selectedNetwork === option.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          )}
                        >
                          <option.icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Media Upload */}
                  {selectedNetwork && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Média</CardTitle>
                        <CardDescription>
                          {selectedNetwork === 'instagram-carousel' && 'Carregue entre 1 e 10 imagens (PNG, JPG - máx. 50MB cada)'}
                          {selectedNetwork === 'instagram-stories' && 'Carregue 1 imagem ou vídeo (PNG, JPG, MP4 - máx. 50MB)'}
                          {selectedNetwork === 'linkedin' && 'Opcional: carregue imagens (PNG, JPG - máx. 50MB cada)'}
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
                            multiple={selectedNetwork !== 'instagram-stories'}
                            accept={selectedNetwork === 'instagram-stories' ? 'image/*,video/*' : 'image/*'}
                            onChange={handleMediaUpload}
                            disabled={saving || submitting || isUploading}
                            className="hidden"
                            aria-label="Carregar ficheiros de média"
                          />
                        </Label>

                        {isUploading && (
                          <Progress value={uploadProgress} className="h-2" />
                        )}
                        
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
                  {selectedNetwork && (
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
                          {selectedNetwork === 'linkedin' && ' (obrigatório)'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={caption}
                          onChange={(e) => setCaption(e.target.value.slice(0, maxLength))}
                          placeholder={
                            selectedNetwork === 'linkedin' 
                              ? "Escreva o corpo do seu post no LinkedIn..." 
                              : "Escreva a sua legenda..."
                          }
                          disabled={saving || submitting}
                          className="min-h-[120px] resize-none"
                          aria-label="Legenda da publicação"
                          aria-describedby="caption-description"
                        />
                        <p id="caption-description" className="sr-only">
                          Campo de texto para a legenda da publicação. 
                          {selectedNetwork === 'linkedin' && ' Este campo é obrigatório para LinkedIn.'}
                          Máximo de {maxLength} caracteres.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Date & Time */}
                  {selectedNetwork && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Agendamento</CardTitle>
                        <CardDescription>Defina quando publicar</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="asap" className="text-sm font-medium">Logo que possível</Label>
                          <Switch
                            id="asap"
                            checked={scheduleAsap}
                            onCheckedChange={setScheduleAsap}
                          />
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
                  {selectedNetwork && (
                    <Card className="lg:sticky lg:bottom-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg">
                      <CardContent className="pt-6 space-y-3">
                        {(saving || submitting) && uploadProgress > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {saving ? 'A guardar...' : 'A submeter...'}
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={saving || submitting || !selectedNetwork || isUploading}
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
                                Guardar rascunho
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSubmitForApproval}
                            disabled={submitting || saving || hasErrors || isUploading}
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
                      {!selectedNetwork ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                          Selecione uma rede social para ver a pré-visualização
                        </div>
                      ) : (
                        <>
                          {selectedNetwork === 'instagram-carousel' && (
                            <InstagramCarouselPreview
                              mediaUrls={mediaPreviewUrls}
                              caption={caption}
                            />
                          )}
                          {selectedNetwork === 'instagram-stories' && (
                            <InstagramStoryPreview
                              mediaUrl={mediaPreviewUrls[0]}
                              aspectRatioValid={true}
                            />
                          )}
                          {selectedNetwork === 'linkedin' && (
                            <LinkedInPreview
                              mediaUrls={mediaPreviewUrls}
                              caption={caption}
                            />
                          )}
                          
                          {scheduledDate && !scheduleAsap && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 justify-center">
                              <Clock className="h-3 w-3" />
                              <span>Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}</span>
                            </div>
                          )}
                        </>
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
    </div>
  );
}
