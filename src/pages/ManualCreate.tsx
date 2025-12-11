import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { ModeBadge } from '@/components/ModeBadge';
import { DevHelper } from '@/components/DevHelper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Send, Calendar as CalendarIcon, ArrowLeft, Instagram, Linkedin, Upload, Clock, FileText, Loader2, Rocket, Smile, Bookmark, Sparkles, Youtube, Facebook, ChevronLeft, ChevronRight, Info, CloudUpload, Image, Video, Plus, CheckCircle, Hash, AtSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { StepProgress } from '@/components/manual-post/StepProgress';
import { HashtagPicker } from '@/components/manual-post/HashtagPicker';
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';
import { AutoSaveIndicator, MediaWarning } from '@/components/manual-post/NoAccountsState';
import { useAutoSave } from '@/hooks/useAutoSave';
import { validateMedia, MediaValidationResult } from '@/lib/mediaValidation';
import InstagramCarouselPreview from '@/components/manual-post/InstagramCarouselPreview';
import InstagramStoryPreview from '@/components/manual-post/InstagramStoryPreview';
import InstagramReelPreview from '@/components/manual-post/InstagramReelPreview';
import LinkedInPreview from '@/components/manual-post/LinkedInPreview';
import LinkedInDocumentPreview from '@/components/manual-post/LinkedInDocumentPreview';
import YouTubeShortsPreview from '@/components/manual-post/YouTubeShortsPreview';
import YouTubeVideoPreview from '@/components/manual-post/YouTubeVideoPreview';
import TikTokPreview from '@/components/manual-post/TikTokPreview';
import FacebookPreview from '@/components/manual-post/FacebookPreview';
import DraftsDialog from '@/components/manual-post/DraftsDialog';
import SavedCaptionsDialog from '@/components/manual-post/SavedCaptionsDialog';
import AICaptionDialog from '@/components/manual-post/AICaptionDialog';
import { NetworkFormatSelector } from '@/components/manual-post/NetworkFormatSelector';
import { getMediaRequirements, validateAllFormats, getValidationSummary, FormatValidationResult } from '@/lib/formatValidation';
import { INSTAGRAM_CONFIG, LINKEDIN_CONFIG, FORMAT_TO_NETWORK, FORMAT_TO_ACCOUNT } from '@/types/publishing';
import { PublishingOverlay } from '@/components/manual-post/PublishingOverlay';
import { PublishProgressModal } from '@/components/publishing/PublishProgressModal';
import { usePublishWithProgress } from '@/hooks/usePublishWithProgress';
import { EnhancedSortableMediaItem, MediaDragOverlay } from '@/components/manual-post/EnhancedSortableMediaItem';
import { DragHintTooltip } from '@/components/manual-post/DragHintTooltip';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { generateCarouselPDF } from '@/lib/pdfGenerator';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Extract first frame from video file
async function extractVideoFrame(videoFile: File | string): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    const cleanup = () => {
      if (typeof videoFile !== 'string') {
        URL.revokeObjectURL(video.src);
      }
    };
    
    video.onloadeddata = () => {
      video.currentTime = 0.5; // Get frame at 0.5s for better thumbnail
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => {
            cleanup();
            if (blob) {
              const fileName = typeof videoFile === 'string' 
                ? 'video-frame.jpg' 
                : videoFile.name.replace(/\.[^.]+$/, '-frame.jpg');
              resolve(new File([blob], fileName, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Could not create blob from canvas'));
            }
          },
          'image/jpeg',
          0.9
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video'));
    };
    
    video.src = typeof videoFile === 'string' ? videoFile : URL.createObjectURL(videoFile);
    video.load();
  });
}

export default function ManualCreate() {
  const navigate = useNavigate();
  const { instagram, linkedin, canPublish, refresh: refreshQuota, isUnlimited } = usePublishingQuota();
  const [selectedFormats, setSelectedFormats] = useState<PostFormat[]>([]);
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
  const [savedCaptionsOpen, setSavedCaptionsOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<string>('');
  const [mediaValidations, setMediaValidations] = useState<MediaValidationResult[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Publishing hook with 2-phase progress
  const { 
    progress: publishProgress, 
    isPublishing: publishing, 
    publish: executePublish, 
    resetProgress 
  } = usePublishWithProgress();

  // Auto-save hook
  const { lastSaved, isSaving: isAutoSaving, hasUnsavedChanges } = useAutoSave({
    caption,
    selectedFormats,
    mediaUrls: mediaPreviewUrls,
    scheduledDate: scheduledDate?.toISOString(),
    time,
    scheduleAsap,
  }, { enabled: selectedFormats.length > 0 || caption.length > 0 });

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [showValidation, setShowValidation] = useState(false);

  // DnD sensors for drag and drop with keyboard support
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Handle drag end for media reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = mediaPreviewUrls.findIndex((_, i) => `media-${i}` === active.id);
      const newIndex = mediaPreviewUrls.findIndex((_, i) => `media-${i}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setMediaPreviewUrls(prev => arrayMove(prev, oldIndex, newIndex));
        setMediaFiles(prev => arrayMove(prev, oldIndex, newIndex));
        toast.success(`Item movido para posição ${newIndex + 1}`);
      }
    }
  }, [mediaPreviewUrls]);

  // Move media item via arrow buttons
  const moveMedia = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaPreviewUrls.length) return;
    
    setMediaPreviewUrls(prev => arrayMove(prev, fromIndex, toIndex));
    setMediaFiles(prev => arrayMove(prev, fromIndex, toIndex));
    toast.success(`Item movido para posição ${toIndex + 1}`);
  }, [mediaPreviewUrls.length]);

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

  // Progressive disclosure logic
  const showStep2 = selectedFormats.length > 0;
  const showStep3 = mediaFiles.length >= (mediaRequirements.minMedia || 1);
  
  // Check if can advance to next step
  const canAdvanceToStep2 = selectedFormats.length > 0;
  const canAdvanceToStep3 = mediaFiles.length >= (mediaRequirements.minMedia || 1);

  // Update visited steps based on progress
  useEffect(() => {
    if (canAdvanceToStep2 && !visitedSteps.includes(2)) {
      setVisitedSteps(prev => [...prev, 2]);
      if (currentStep === 1) setCurrentStep(2);
    }
  }, [canAdvanceToStep2, visitedSteps, currentStep]);

  useEffect(() => {
    if (canAdvanceToStep3 && !visitedSteps.includes(3)) {
      setVisitedSteps(prev => [...prev, 3]);
      if (currentStep === 2) setCurrentStep(3);
    }
  }, [canAdvanceToStep3, visitedSteps, currentStep]);

  // Step navigation functions
  const goToStep = (step: number) => {
    if (visitedSteps.includes(step)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      const nextStepNum = currentStep + 1;
      if (!visitedSteps.includes(nextStepNum)) {
        setVisitedSteps(prev => [...prev, nextStepNum]);
      }
      setCurrentStep(nextStepNum);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  // Validations - only show when user tries to proceed
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

  // Handle publish/submit with validation
  const handlePublishWithValidation = async () => {
    if (hasErrors) {
      setShowValidation(true);
      toast.error('Corrija os campos obrigatórios antes de publicar');
      return;
    }
    handlePublishNow();
  };

  const handleSubmitWithValidation = async () => {
    if (hasErrors) {
      setShowValidation(true);
      toast.error('Corrija os campos obrigatórios antes de submeter');
      return;
    }
    handleSubmitForApproval();
  };

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

    // Validate file types - support video for carousels and posts
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const supportsVideo = selectedFormats.some(f => 
      f.includes('reel') || f.includes('stories') || f.includes('shorts') || f.includes('video') ||
      f === 'instagram_image' || f === 'instagram_carousel' || f === 'linkedin_post' || 
      f === 'facebook_image' || f === 'tiktok_video'
    );
    // Also allow video if we have linkedin_document (will extract frame for PDF)
    const hasLinkedInDocument = selectedFormats.includes('linkedin_document');
    if (supportsVideo || hasLinkedInDocument || !mediaRequirements.requiresImage) {
      validTypes.push('video/mp4', 'video/quicktime', 'video/webm');
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
    
    // Validate media for selected formats
    if (selectedFormats.length > 0) {
      const validations: MediaValidationResult[] = [];
      for (const file of files) {
        const result = await validateMedia(file, selectedFormats[0]);
        validations.push(result);
      }
      setMediaValidations(validations);
      
      // Show warnings if any
      const hasWarnings = validations.some(v => v.warnings.length > 0);
      if (hasWarnings) {
        toast.warning('Alguns ficheiros têm avisos de qualidade', { duration: 4000 });
      }
    }
    
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

    // Check quota for selected networks before publishing
    const instagramSelected = selectedNetworks.includes('instagram');
    const linkedinSelected = selectedNetworks.includes('linkedin');
    
    if (instagramSelected && !instagram.canPublish && !isUnlimited) {
      toast.error('Quota Instagram esgotada. Não é possível publicar.', { duration: 5000 });
      return;
    }
    
    if (linkedinSelected && !linkedin.canPublish && !isUnlimited) {
      toast.error('Quota LinkedIn esgotada. Não é possível publicar.', { duration: 5000 });
      return;
    }

    // Use the new hook to publish
    const success = await executePublish({
      formats: selectedFormats,
      caption,
      mediaFiles,
      scheduledDate,
      time,
      scheduleAsap,
    });

    if (success) {
      await refreshQuota();
    }
  };

  // Handlers for progress modal
  const handleCreateNew = () => {
    resetProgress();
    setCaption('');
    setMediaFiles([]);
    setMediaPreviewUrls([]);
    setScheduledDate(undefined);
    setTime('12:00');
    setScheduleAsap(false);
    setCurrentDraftId(null);
    setSelectedFormats([]);
    setCurrentStep(1);
    setVisitedSteps([1]);
  };

  const handleViewCalendar = () => {
    resetProgress();
    navigate('/calendar');
  };

  // Get accept types for file input - always allow both for carousel and when linkedin_document is present
  const getAcceptTypes = () => {
    if (mediaRequirements.requiresVideo) return 'video/*';
    // Always allow video for carousel formats and when linkedin_document is selected
    const hasCarouselOrDocument = selectedFormats.some(f => 
      f === 'instagram_carousel' || f === 'linkedin_document' || f === 'linkedin_post' || 
      f === 'facebook_image' || f.includes('stories')
    );
    if (hasCarouselOrDocument) return 'image/*,video/*';
    if (mediaRequirements.requiresImage) return 'image/*';
    return 'image/*,video/*';
  };

  // Build mediaItems with proper isVideo detection from File types
  const mediaItems = useMemo(() => {
    return mediaPreviewUrls.map((url, idx) => ({
      url,
      isVideo: mediaFiles[idx]?.type?.startsWith('video/') || false
    }));
  }, [mediaPreviewUrls, mediaFiles]);

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
      return <InstagramCarouselPreview mediaItems={mediaItems} caption={caption} />;
    }
    
    if (network === 'linkedin') {
      // Use document preview for linkedin_document, regular preview for linkedin_post
      if (format === 'linkedin_document') {
        return <LinkedInDocumentPreview mediaUrls={mediaPreviewUrls} mediaFiles={mediaFiles} caption={caption} />;
      }
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
    <div className="max-w-7xl mx-auto space-y-4 bg-gradient-to-br from-background to-background-secondary">
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

      {/* Quota Warning */}
      {selectedNetworks.length > 0 && !isUnlimited && (
        (selectedNetworks.includes('instagram') && instagram.percentage >= 80) ||
        (selectedNetworks.includes('linkedin') && linkedin.percentage >= 80)
      ) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            {selectedNetworks.includes('instagram') && instagram.percentage >= 100 && 'Quota Instagram esgotada. '}
            {selectedNetworks.includes('linkedin') && linkedin.percentage >= 100 && 'Quota LinkedIn esgotada. '}
            {((selectedNetworks.includes('instagram') && instagram.percentage >= 80 && instagram.percentage < 100) ||
              (selectedNetworks.includes('linkedin') && linkedin.percentage >= 80 && linkedin.percentage < 100)) && 
              'Atenção: quota quase esgotada. '}
            Instagram: {instagram.quotaText} | LinkedIn: {linkedin.quotaText}
          </span>
        </div>
      )}

      {/* Stepper */}
      <Card className="border-0 shadow-none bg-transparent">
        <StepProgress
          currentStep={currentStep}
          visitedSteps={visitedSteps}
          onStepClick={goToStep}
        />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left - Form */}
        <div className="space-y-6">
          {/* Step 1: Network & Format Selection */}
          <div className="relative">
            <NetworkFormatSelector
              selectedFormats={selectedFormats}
              onFormatsChange={setSelectedFormats}
            />
            
            {/* Step 1 Navigation */}
            {currentStep === 1 && selectedFormats.length > 0 && (
              <div className="flex justify-end mt-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={nextStep}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Seguinte
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Media Upload - Progressive Disclosure */}
          <div className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            showStep2 ? "opacity-100 max-h-[2000px]" : "opacity-0 max-h-0"
          )}>
            <Card>

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CloudUpload className="h-5 w-5 text-primary" />
                    Média
                    <SectionHelp content={getSectionTooltip('media')} />
                  </CardTitle>
                  <AutoSaveIndicator 
                    lastSaved={lastSaved} 
                    isSaving={isAutoSaving} 
                    hasUnsavedChanges={hasUnsavedChanges} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Zone - Empty State */}
                {mediaPreviewUrls.length === 0 && (
                  <Label 
                    htmlFor="media-upload" 
                    className={cn(
                      "cursor-pointer block",
                      (saving || submitting || isUploading) && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div className={cn(
                      "relative flex flex-col items-center justify-center gap-3 h-48 rounded-xl",
                      "border-2 border-dashed transition-all duration-300",
                      "hover:border-primary/50 hover:bg-primary/5",
                      "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                    )}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                          <span className="text-sm text-muted-foreground">A processar ficheiros...</span>
                        </>
                      ) : (
                        <>
                          <div className="p-4 rounded-full bg-primary/10">
                            <CloudUpload className="h-8 w-8 text-primary animate-float" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">Arrasta imagens ou vídeos para aqui</p>
                            <p className="text-sm text-muted-foreground">ou clica para selecionar ficheiros</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs bg-background">PNG</Badge>
                            <Badge variant="outline" className="text-xs bg-background">JPG</Badge>
                            <Badge variant="outline" className="text-xs bg-background">MP4</Badge>
                            <Badge variant="outline" className="text-xs bg-background">GIF</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/70">
                            Máx. 50MB por ficheiro • {mediaRequirements.minMedia}-{mediaRequirements.maxMedia} ficheiros
                          </p>
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
                )}

                {isUploading && <Progress value={uploadProgress} className="h-2" />}
                
                {/* Media Grid - With Files */}
                {mediaPreviewUrls.length > 0 && (
                  <div className="space-y-3">
                    {/* Drag hint for first-time users */}
                    {mediaPreviewUrls.length > 1 && (
                      <DragHintTooltip show={mediaPreviewUrls.length > 1} />
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Arraste para reordenar ou use as setas
                      </span>
                      <span className="font-medium">{mediaPreviewUrls.length} de {mediaRequirements.maxMedia} ficheiros</span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={mediaPreviewUrls.map((_, i) => `media-${i}`)}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="grid grid-cols-3 gap-3">
                          {mediaPreviewUrls.map((url, idx) => {
                            const isVideo = mediaFiles[idx]?.type?.startsWith('video/');
                            return (
                              <EnhancedSortableMediaItem
                                key={`media-${idx}`}
                                id={`media-${idx}`}
                                url={url}
                                index={idx}
                                total={mediaPreviewUrls.length}
                                isVideo={isVideo}
                                disabled={saving || submitting || publishing}
                                onRemove={() => removeMedia(idx)}
                                onMoveUp={() => moveMedia(idx, idx - 1)}
                                onMoveDown={() => moveMedia(idx, idx + 1)}
                              />
                            );
                          })}
                          
                          {/* Add More Button */}
                          {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                            <Label 
                              htmlFor="media-upload-more"
                              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all press-effect"
                            >
                              <Plus className="h-6 w-6 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Adicionar</span>
                              <Input
                                id="media-upload-more"
                                type="file"
                                multiple={mediaRequirements.maxMedia > 1}
                                accept={getAcceptTypes()}
                                onChange={handleMediaUpload}
                                disabled={saving || submitting || isUploading}
                                className="hidden"
                              />
                            </Label>
                          )}
                        </div>
                      </SortableContext>
                      
                      {/* Drag Overlay - Shows preview while dragging */}
                      <DragOverlay dropAnimation={{
                        duration: 200,
                        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                      }}>
                        {activeId ? (
                          <MediaDragOverlay
                            url={mediaPreviewUrls[parseInt(activeId.replace('media-', ''))]}
                            isVideo={mediaFiles[parseInt(activeId.replace('media-', ''))]?.type?.startsWith('video/')}
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )}
                
                {/* Step 2 Navigation */}
                <div className="flex justify-between mt-3 pt-3 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={previousStep}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  {mediaPreviewUrls.length >= (mediaRequirements.minMedia || 1) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={nextStep}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Seguinte
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Caption & Scheduling - Progressive Disclosure */}
          <div className={cn(
            "transition-all duration-300 ease-out overflow-hidden space-y-6",
            showStep3 ? "opacity-100 max-h-[3000px]" : "opacity-0 max-h-0"
          )}>
            {/* Caption */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Legenda
                  <SectionHelp content={getSectionTooltip('caption')} />
                </CardTitle>
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

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Agendamento
                  <SectionHelp content={getSectionTooltip('scheduling')} />
                </CardTitle>
                <CardDescription>Defina quando publicar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle Pill Style */}
                <div className="flex rounded-full bg-muted p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setScheduleAsap(true)}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                      scheduleAsap 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Rocket className="h-4 w-4" />
                    Publicar agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleAsap(false)}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                      !scheduleAsap 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Agendar
                  </button>
                </div>
                
                {scheduleAsap ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Será publicado assim que clicares em Publicar
                  </p>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    {/* Smart suggestion badge */}
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10 transition-colors w-full justify-center py-2"
                      onClick={() => {
                        const nextTuesday = new Date();
                        nextTuesday.setDate(nextTuesday.getDate() + ((2 + 7 - nextTuesday.getDay()) % 7 || 7));
                        setScheduledDate(nextTuesday);
                        setTime('18:00');
                      }}
                    >
                      💡 Melhor horário sugerido: Terça 18:00
                    </Badge>
                    
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
                      <p className="text-xs text-muted-foreground mt-1">Fuso horário: Lisboa (WET)</p>
                    </div>
                  </div>
                )}
                
                {/* Step 3 Navigation */}
                <div className="flex justify-start mt-3 pt-3 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={previousStep}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions - Reorganized Hierarchy */}
            <Card className="lg:sticky lg:bottom-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg">
              <CardContent className="pt-6 space-y-4">
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

                {/* Validation - Only show when triggered */}
                {showValidation && validationErrors.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg" role="alert">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      {validationErrors.map((error, idx) => (
                        <p key={idx}>{error}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Primary Actions Row */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handlePublishWithValidation}
                    disabled={publishing || submitting || saving || isUploading}
                    className={cn(
                      "flex-1 font-semibold",
                      "bg-gradient-to-r from-primary to-primary/80",
                      "hover:from-primary/90 hover:to-primary/70 hover:shadow-lg",
                      "active:scale-[0.98] transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      if (!scheduledDate) {
                        toast.info('Selecione uma data de agendamento');
                        return;
                      }
                      handlePublishWithValidation();
                    }}
                    disabled={publishing || submitting || saving || isUploading}
                    className={cn(
                      "flex-1 font-semibold border-2 border-primary text-primary",
                      "hover:bg-primary/10 hover:shadow-md",
                      "active:scale-[0.98] transition-all duration-200"
                    )}
                    aria-label="Agendar publicação"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Agendar
                  </Button>
                </div>
                
                {/* Secondary Actions Row */}
                <div className="flex items-center justify-center gap-4 text-xs pt-2">
                  <button 
                    onClick={handleSaveDraft}
                    disabled={saving || submitting || publishing || isUploading}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {saving ? 'A guardar...' : 'Guardar rascunho'}
                  </button>
                  <span className="text-muted-foreground/50">|</span>
                  <button 
                    onClick={() => setDraftsDialogOpen(true)}
                    disabled={saving || submitting}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Ver rascunhos
                  </button>
                  <span className="text-muted-foreground/50">|</span>
                  <button 
                    onClick={() => navigate('/calendar')}
                    disabled={saving || submitting}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Ver calendário
                  </button>
                </div>

                {/* Submit for Approval - Only if approval flow exists */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSubmitWithValidation}
                  disabled={submitting || saving || publishing || isUploading}
                  className="w-full"
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
                      Submeter para aprovação
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
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

      {/* Publish Progress Modal with 2 phases */}
      <PublishProgressModal
        isOpen={publishing || (publishProgress.phase2.status !== 'idle' && publishProgress.phase2.status !== 'waiting')}
        onClose={() => {
          if (!publishing) {
            resetProgress();
          }
        }}
        progress={publishProgress}
        onCreateNew={handleCreateNew}
        onViewCalendar={handleViewCalendar}
      />
    </div>
  );
}
