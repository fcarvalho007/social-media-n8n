import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MediaItem } from '@/types/social';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ModeBadge } from '@/components/ModeBadge';
import { DevHelper } from '@/components/DevHelper';
import { SidebarProvider } from '@/components/ui/sidebar';
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
import { Save, Send, Calendar as CalendarIcon, ArrowLeft, Instagram, Linkedin, Upload, Clock, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedNetwork === 'instagram-carousel' && files.length > 10) {
      toast.error('Máximo 10 imagens para carrossel');
      return;
    }
    
    if (selectedNetwork === 'instagram-stories' && files.length > 1) {
      toast.error('Stories permite apenas 1 ficheiro');
      return;
    }
    
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setMediaFiles(files);
    setMediaPreviewUrls(urls);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tem de iniciar sessão');
        return;
      }

      // Upload media files to storage
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
        
        mediaUrls.push(publicUrl);
      }

      const postData = {
        user_id: user.id,
        post_type: selectedNetwork === 'instagram-carousel' ? 'carousel' : selectedNetwork === 'instagram-stories' ? 'image' : 'text',
        selected_networks: [selectedNetwork.split('-')[0]] as any,
        caption,
        scheduled_date: scheduledDate?.toISOString() || null,
        schedule_asap: scheduleAsap,
        status: 'draft',
        origin_mode: 'manual',
        tema: 'Manual post',
        template_a_images: mediaUrls,
        template_b_images: [],
        workflow_id: 'manual-' + Date.now(),
      };

      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;

      toast.success('Rascunho guardado');
      navigate('/?tab=approve');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Falha ao guardar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (hasErrors) {
      toast.error('Corrija os erros: ' + validationErrors.join(', '));
      return;
    }

    try {
      setSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Tem de iniciar sessão');
        return;
      }

      // Upload media to storage
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);
        
        mediaUrls.push(publicUrl);
      }

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

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Call edge function to submit to N8N
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

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao submeter');
      }

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

      toast.success('Publicação submetida para aprovação');
      navigate('/calendar');
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao submeter. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  };


  const networkOptions: { value: NetworkType; label: string; icon: any; description: string }[] = [
    { value: 'instagram-carousel', label: 'Instagram Carrossel', icon: Instagram, description: '1-10 imagens' },
    { value: 'instagram-stories', label: 'Instagram Stories', icon: Instagram, description: '1 imagem ou vídeo' },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, description: 'Post com legenda' },
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=create')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <ModeBadge mode="manual" onChangeMode={() => navigate('/?tab=create')} className="flex-1" />
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
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
                        <div
                          key={option.value}
                          onClick={() => setSelectedNetwork(option.value)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                            selectedNetwork === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-border/80 hover:bg-accent/50"
                          )}
                        >
                          <option.icon className="h-6 w-6" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Media Upload */}
                  {selectedNetwork && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Média</CardTitle>
                        <CardDescription>
                          {selectedNetwork === 'instagram-carousel' && 'Carregue entre 1 e 10 imagens'}
                          {selectedNetwork === 'instagram-stories' && 'Carregue 1 imagem ou vídeo'}
                          {selectedNetwork === 'linkedin' && 'Opcional: carregue imagens'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Label htmlFor="media-upload" className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/30">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Carregar ficheiros</span>
                          </div>
                          <Input
                            id="media-upload"
                            type="file"
                            multiple={selectedNetwork !== 'instagram-stories'}
                            accept={selectedNetwork === 'instagram-stories' ? 'image/*,video/*' : 'image/*'}
                            onChange={handleMediaUpload}
                            className="hidden"
                          />
                        </Label>
                        
                        {mediaPreviewUrls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {mediaPreviewUrls.map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removeMedia(idx)}
                                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
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
                          {captionLength}/{maxLength} caracteres
                          {selectedNetwork === 'linkedin' && ' (obrigatório)'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={caption}
                          onChange={(e) => setCaption(e.target.value.slice(0, maxLength))}
                          placeholder="Escreva a sua legenda..."
                          className="min-h-[120px] resize-none"
                        />
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
                    <Card className="sticky bottom-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg">
                      <CardContent className="pt-6 space-y-3">
                        {validationErrors.length > 0 && (
                          <div className="space-y-1">
                            {validationErrors.map((error, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={saving || !selectedNetwork}
                            className="font-semibold"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Guardar rascunho
                          </Button>
                          <Button
                            onClick={handleSubmitForApproval}
                            disabled={saving || hasErrors}
                            className="font-semibold"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submeter para aprovação
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/calendar')}
                          className="w-full text-xs"
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Ver calendário
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right - Preview */}
                <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Pré-visualização</CardTitle>
                      <CardDescription>Como ficará a sua publicação</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!selectedNetwork ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                          Selecione uma rede social para ver a pré-visualização
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            {selectedNetwork.includes('instagram') ? <Instagram className="h-5 w-5" /> : <Linkedin className="h-5 w-5" />}
                            <span className="font-semibold text-sm">{networkOptions.find(o => o.value === selectedNetwork)?.label}</span>
                          </div>
                          
                          {mediaPreviewUrls.length > 0 && (
                            <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                              <img src={mediaPreviewUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          
                          {caption && (
                            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
                            </div>
                          )}
                          
                          {scheduledDate && !scheduleAsap && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>

        <DevHelper />
      </div>
    </SidebarProvider>
  );
}
