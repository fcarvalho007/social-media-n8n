import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { generateSafeStoragePath } from '@/lib/fileNameSanitizer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { MediaSource } from '@/types/media';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { CompactModeBadge } from '@/components/CompactModeBadge';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Save, Send, Calendar as CalendarIcon, ArrowLeft, Instagram, Linkedin, Upload, Clock, FileText, Loader2, Rocket, Smile, Bookmark, Sparkles, Youtube, Facebook, ChevronLeft, ChevronRight, Info, CloudUpload, Image, Video, Plus, CheckCircle, Hash, AtSign, AlertTriangle, Eye, ChevronDown, MapPin, Grid3x3, RefreshCw, X, Globe, CheckCircle2, Smartphone } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, nextDay } from 'date-fns';
import { GridSplitter } from '@/components/media/GridSplitter';
import { MediaUploadSection } from '@/components/media/MediaUploadSection';
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
import GoogleBusinessPreview from '@/components/manual-post/GoogleBusinessPreview';
import DraftsDialog from '@/components/manual-post/DraftsDialog';
import SavedCaptionsDialog from '@/components/manual-post/SavedCaptionsDialog';
import AICaptionDialog from '@/components/manual-post/AICaptionDialog';
import { NetworkFormatSelector } from '@/components/manual-post/NetworkFormatSelector';
import { getMediaRequirements, validateAllFormats, getValidationSummary, FormatValidationResult } from '@/lib/formatValidation';
import { INSTAGRAM_CONFIG, LINKEDIN_CONFIG, FORMAT_TO_NETWORK, FORMAT_TO_ACCOUNT } from '@/types/publishing';
import { PublishingOverlay } from '@/components/manual-post/PublishingOverlay';
import { PublishProgressModal } from '@/components/publishing/PublishProgressModal';

import { useSmartValidation } from '@/hooks/useSmartValidation';
import { ValidationSidebar, ValidationMobileBadge } from '@/components/manual-post/ValidationSidebar';
import { usePublishWithProgress } from '@/hooks/usePublishWithProgress';
import { DuplicateWarningDialog } from '@/components/publishing/DuplicateWarningDialog';
import { EnhancedSortableMediaItem, MediaDragOverlay } from '@/components/manual-post/EnhancedSortableMediaItem';
import { NetworkCaptionEditor } from '@/components/manual-post/NetworkCaptionEditor';
import { DragHintTooltip } from '@/components/manual-post/DragHintTooltip';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { generateCarouselPDF } from '@/lib/pdfGenerator';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { detectOversizedImages, compressOversizedFiles, OversizedImage } from '@/lib/canvas/imageCompression';
import { ImageCompressionConfirmModal } from '@/components/publishing/ImageCompressionConfirmModal';
import { VideoValidationModal, VideoValidationIssue } from '@/components/publishing/VideoValidationModal';
import { getVideoDimensions, FORMAT_ASPECT_RATIOS, MAX_VIDEO_DURATION, MIN_RESOLUTIONS } from '@/lib/mediaValidation';

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

// Detect image aspect ratio from file - with wider tolerance for Grid Splitter crops
async function detectImageAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      URL.revokeObjectURL(url);
      
      const ratio = w / h;
      
      // Map to common aspect ratios with wider tolerance for Grid Splitter crops
      // 1:1 = 1.0
      if (ratio >= 0.92 && ratio <= 1.08) resolve('1:1');
      // 3:4 = 0.75 - wider tolerance to catch Grid Splitter variations (0.68-0.82)
      else if (ratio >= 0.68 && ratio <= 0.82) resolve('3:4');
      // 4:5 = 0.8 - narrower window since 3:4 now covers more
      else if (ratio >= 0.82 && ratio <= 0.88) resolve('4:5');
      // 4:3 = 1.33
      else if (ratio >= 1.25 && ratio <= 1.42) resolve('4:3');
      // 16:9 = 1.78
      else if (ratio >= 1.65 && ratio <= 1.90) resolve('16:9');
      // 9:16 = 0.5625
      else if (ratio >= 0.50 && ratio <= 0.62) resolve('9:16');
      // Fallbacks
      else if (ratio < 1) resolve('3:4'); // Vertical default - use 3:4 for carousel images
      else resolve('4:3'); // Horizontal default
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('3:4'); // Default fallback - 3:4 for carousel images
    };
    
    img.src = url;
  });
}

// Detect video aspect ratio from file
async function detectVideoAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h } = video;
      URL.revokeObjectURL(url);
      
      const ratio = w / h;
      
      // Map to common aspect ratios
      if (ratio >= 0.95 && ratio <= 1.05) resolve('1:1');
      else if (ratio >= 0.72 && ratio <= 0.78) resolve('3:4');
      else if (ratio >= 0.78 && ratio <= 0.82) resolve('4:5');
      else if (ratio >= 1.28 && ratio <= 1.38) resolve('4:3');
      else if (ratio >= 1.70 && ratio <= 1.82) resolve('16:9');
      else if (ratio >= 0.54 && ratio <= 0.58) resolve('9:16');
      else if (ratio < 1) resolve('9:16'); // Vertical default for videos (Reels, Stories, TikTok)
      else resolve('16:9'); // Horizontal default
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('9:16'); // Default fallback for vertical videos
    };
    
    video.src = url;
  });
}

export default function ManualCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recoverPostId = searchParams.get('recover');
  const { instagram, linkedin, canPublish, refresh: refreshQuota, isUnlimited } = usePublishingQuota();
  const [selectedFormats, setSelectedFormats] = useState<PostFormat[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveredPostId, setRecoveredPostId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [time, setTime] = useState('12:00');
  const [scheduleAsap, setScheduleAsap] = useState(true);
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
  // Separate captions per network
  const [useSeparateCaptions, setUseSeparateCaptions] = useState(false);
  const [networkCaptions, setNetworkCaptions] = useState<Record<string, string>>({});
  const mediaSectionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Compression confirmation state
  const [compressionModalOpen, setCompressionModalOpen] = useState(false);
  const [oversizedImages, setOversizedImages] = useState<OversizedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<{ current: number; total: number; fileName: string } | undefined>();
  const [compressionStep, setCompressionStep] = useState<'warning' | 'compressing' | 'confirmation'>('warning');
  const [compressionResults, setCompressionResults] = useState<{ originalSizeMB: number; finalSizeMB: number; qualityUsed: number; wasResized: boolean }[]>([]);
  const [pendingCompressedFiles, setPendingCompressedFiles] = useState<File[]>([]);
  
  // Video validation state
  const [videoValidationModalOpen, setVideoValidationModalOpen] = useState(false);
  const [videoValidationIssues, setVideoValidationIssues] = useState<VideoValidationIssue[]>([]);
  const [pendingVideoFiles, setPendingVideoFiles] = useState<File[]>([]);

  // Publishing hook with 2-phase progress
  const { 
    progress: publishProgress, 
    isPublishing: publishing, 
    publish: executePublish, 
    resetProgress,
    cancelPublishing
  } = usePublishWithProgress();
  
  // State for cancellation
  const [isCancellingPublish, setIsCancellingPublish] = useState(false);
  
  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; created_at: string; selected_networks: string[] | null; status: string | null } | null>(null);
  const [pendingPublishParams, setPendingPublishParams] = useState<any>(null);

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
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
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
        setMediaSources(prev => arrayMove(prev, oldIndex, newIndex));
        toast.success(`Item movido para posição ${newIndex + 1}`);
      }
    }
  }, [mediaPreviewUrls]);

  // Move media item via arrow buttons
  const moveMedia = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaPreviewUrls.length) return;
    
    setMediaPreviewUrls(prev => arrayMove(prev, fromIndex, toIndex));
    setMediaFiles(prev => arrayMove(prev, fromIndex, toIndex));
    setMediaSources(prev => arrayMove(prev, fromIndex, toIndex));
    toast.success(`Item movido para posição ${toIndex + 1}`);
  }, [mediaPreviewUrls.length]);

  // Cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Fetch image URL and convert to File
  const fetchImageAsFile = useCallback(async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      const fileName = url.split('/').pop() || `image-${Date.now()}.jpg`;
      return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    } catch (error) {
      console.error('Error fetching image as file:', error);
      return null;
    }
  }, []);

  // Load post data for recovery with full field support
  const loadPostForRecovery = useCallback(async (postId: string) => {
    setIsRecovering(true);
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      if (!post) {
        toast.error('Post não encontrado');
        setIsRecovering(false);
        return;
      }

      // Set caption (prefer edited version)
      setCaption(post.caption_edited || post.caption || '');

      // Load linkedin_body for separate captions
      if (post.linkedin_body) {
        setUseSeparateCaptions(true);
        setNetworkCaptions(prev => ({
          ...prev,
          linkedin: post.linkedin_body || '',
        }));
      }

      // Load first_comment (will be handled by FirstCommentInput component if available)
      // For now, store in state if the component supports it
      const firstComment = post.first_comment || '';

      // Load hashtags
      const hashtagsEdited = post.hashtags_edited as string[] || [];
      const hashtagsText = post.hashtags_text || '';
      
      // If we have hashtags, append them to caption (if not already there)
      if (hashtagsText && !post.caption?.includes(hashtagsText)) {
        const fullCaption = (post.caption_edited || post.caption || '') + '\n\n' + hashtagsText;
        setCaption(fullCaption);
      } else if (hashtagsEdited.length > 0 && !post.caption?.includes('#')) {
        const hashtagString = hashtagsEdited.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
        const fullCaption = (post.caption_edited || post.caption || '') + '\n\n' + hashtagString;
        setCaption(fullCaption);
      }

      // Load media URLs - use template_a_images, media_items, or media_urls_backup
      const imageUrls = post.template_a_images || [];
      const mediaItems = post.media_items as any[] || [];
      const mediaBackup = post.media_urls_backup as string[] || [];
      
      // Combine URLs from all sources (prioritize backup if available)
      const allUrls = mediaBackup.length > 0 ? [...mediaBackup] : [...imageUrls];
      mediaItems.forEach((item: any) => {
        if (item?.url && !allUrls.includes(item.url)) {
          allUrls.push(item.url);
        }
      });
      
      if (allUrls.length > 0) {
        setMediaPreviewUrls(allUrls);
        setMediaSources(allUrls.map(() => 'url' as MediaSource));
        
        // Convert URLs to Files for proper publishing
        toast.info('A carregar imagens...');
        const filePromises = allUrls.map(url => fetchImageAsFile(url));
        const files = await Promise.all(filePromises);
        const validFiles = files.filter((f): f is File => f !== null);
        
        if (validFiles.length > 0) {
          setMediaFiles(validFiles);
          // Detect aspect ratios for each file
          const aspectRatios = await Promise.all(
            validFiles.map(file => 
              file.type.startsWith('video/') 
                ? detectVideoAspectRatio(file) 
                : detectImageAspectRatio(file)
            )
          );
          setMediaAspectRatios(aspectRatios);
        }
      }

      // Load alt_texts if available
      const altTexts = post.alt_texts as Record<string, string> || {};
      // These will be handled by AltTextManager if integrated

      // Map selected_networks to PostFormat[]
      const networks = post.selected_networks || [];
      const postType = post.post_type || 'carousel';
      
      const formats: PostFormat[] = [];
      networks.forEach((network: string) => {
        // Map network + post_type to format
        const formatMap: Record<string, Record<string, PostFormat>> = {
          instagram: {
            carousel: 'instagram_carousel',
            image: 'instagram_image',
            reel: 'instagram_reel',
            stories: 'instagram_stories',
            video: 'instagram_reel',
          },
          linkedin: {
            carousel: 'linkedin_document',
            post: 'linkedin_post',
            image: 'linkedin_post',
            document: 'linkedin_document',
          },
          youtube: {
            shorts: 'youtube_shorts',
            video: 'youtube_video',
          },
          tiktok: {
            video: 'tiktok_video',
          },
          facebook: {
            image: 'facebook_image',
            stories: 'facebook_stories',
            reel: 'facebook_reel',
            video: 'facebook_reel',
          },
          googlebusiness: {
            post: 'googlebusiness_post',
            image: 'googlebusiness_post',
          },
        };
        
        const networkFormats = formatMap[network];
        if (networkFormats) {
          const format = networkFormats[postType] || Object.values(networkFormats)[0];
          if (format && !formats.includes(format)) {
            formats.push(format);
          }
        }
      });
      
      if (formats.length > 0) {
        setSelectedFormats(formats);
      }

      // Set scheduling (default to ASAP for recovery)
      setScheduleAsap(true);

      // Mark as recovered
      setRecoveredPostId(postId);
      
      // Advance to step 2 or 3 based on what's loaded
      if (formats.length > 0) {
        setVisitedSteps([1, 2]);
        setCurrentStep(2);
        if (allUrls.length > 0) {
          setVisitedSteps([1, 2, 3]);
          setCurrentStep(3);
        }
      }

      toast.success('Conteúdo recuperado com sucesso!', {
        description: `${allUrls.length} ficheiros carregados`,
      });
    } catch (error) {
      console.error('Error loading post for recovery:', error);
      toast.error('Erro ao recuperar conteúdo');
    } finally {
      setIsRecovering(false);
    }
  }, [fetchImageAsFile]);

  // Load post on mount if recover param is present
  useEffect(() => {
    if (recoverPostId && !recoveredPostId) {
      loadPostForRecovery(recoverPostId);
    }
  }, [recoverPostId, recoveredPostId, loadPostForRecovery]);

  // Compute media requirements based on selected formats
  const mediaRequirements = useMemo(() => getMediaRequirements(selectedFormats), [selectedFormats]);

  // Compute validations
  const validations = useMemo(() => {
    if (selectedFormats.length === 0) return {} as Record<PostFormat, FormatValidationResult>;
    return validateAllFormats(selectedFormats, caption, mediaFiles);
  }, [selectedFormats, caption, mediaFiles]);

  const validationSummary = useMemo(() => getValidationSummary(validations), [validations]);

  // Mobile bottom-sheet state for the validation panel
  const [validationSheetOpen, setValidationSheetOpen] = useState(false);

  // Smart pre-validation (real-time)
  const smartValidation = useSmartValidation({
    selectedFormats,
    caption,
    mediaFiles,
    hashtags: [],
    scheduledDate: scheduledDate ?? null,
    scheduleAsap,
    enabled: selectedFormats.length > 0,
    fixHelpers: {
      setCaption,
      setMediaFiles,
      focusCaption: () => textareaRef.current?.focus(),
    },
  });

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
    
    // Instagram carousel: allow >10 with warning instead of error
    const hasInstagramCarousel = selectedFormats.includes('instagram_carousel');
    if (hasInstagramCarousel && totalMedia > 10) {
      // Warning will be shown, not blocking error
    } else if (totalMedia > mediaRequirements.maxMedia) {
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
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de publicar');
      return;
    }
    if (hasErrors) {
      setShowValidation(true);
      toast.error('Corrija os campos obrigatórios antes de publicar');
      return;
    }
    handlePublishNow();
  };

  const handleSubmitWithValidation = async () => {
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de submeter');
      return;
    }
    if (hasErrors) {
      setShowValidation(true);
      toast.error('Corrija os campos obrigatórios antes de submeter');
      return;
    }
    handleSubmitForApproval();
  };

  // Handle media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    
    const maxAllowed = mediaRequirements.maxMedia;
    const totalAfterUpload = mediaFiles.length + newFiles.length;
    
    // Check if adding new files would exceed the limit
    // For Instagram carousel, allow >10 but warn (Getlate receives all, IG API limit is 10)
    const hasInstagramCarousel = selectedFormats.includes('instagram_carousel');
    if (totalAfterUpload > maxAllowed) {
      toast.error(`Máximo ${maxAllowed} ficheiros. Já tem ${mediaFiles.length}.`);
      return;
    } else if (hasInstagramCarousel && totalAfterUpload > 10) {
      toast.warning(
        `Atenção: API Instagram aceita máx. 10 imagens. A enviar ${totalAfterUpload} para Getlate.`,
        { duration: 6000 }
      );
    }

    // Validate file sizes
    // Allow large images (up to 50MB) - compression will happen at publish time if needed for Instagram
    // Videos: 650MB limit
    const MAX_IMAGE_SIZE_MB = 50;
    const MAX_VIDEO_SIZE_MB = 650;
    const isLinkedInDocument = selectedFormats.includes('linkedin_document');
    
    for (const file of newFiles) {
      const sizeMB = file.size / (1024 * 1024);
      const isVideo = file.type.startsWith('video/');
      const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
      
      if (sizeMB > maxSizeMB) {
        const fileType = isVideo ? 'Vídeo' : 'Imagem';
        toast.error(`${fileType} "${file.name}" excede ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB)`);
        return;
      }
      
      // Informative toast for images > 4MB (will be compressed at publish time)
      if (!isVideo && sizeMB > 4) {
        toast.info(
          `Imagem "${file.name}" (${sizeMB.toFixed(1)}MB) será comprimida automaticamente antes da publicação.`,
          { duration: 4000 }
        );
      }
      
      // Warning for large images in LinkedIn Document (may slow down PDF generation)
      if (!isVideo && sizeMB > 10 && isLinkedInDocument) {
        toast.warning(`Imagem "${file.name}" é grande (${sizeMB.toFixed(1)}MB). A geração do PDF pode demorar.`, { duration: 5000 });
      }
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
    const invalidTypes = newFiles.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      toast.error('Formato não suportado. Use PNG, JPG ou MP4');
      return;
    }
    
    // Validate video constraints for ALL selected formats
    const videoFiles = newFiles.filter(f => f.type.startsWith('video/'));
    
    const getFormatLabel = (fmt: PostFormat): string => {
      return getFormatConfig(fmt)?.label || fmt;
    };
    
    if (videoFiles.length > 0 && selectedFormats.length > 0) {
      const issues: VideoValidationIssue[] = [];
      
      for (const videoFile of videoFiles) {
        try {
          const videoInfo = await getVideoDimensions(videoFile);
          const videoRatio = videoInfo.width / videoInfo.height;
          const isVertical = videoRatio < 0.8; // 9:16 style
          const isHorizontal = videoRatio > 1.2; // 16:9 style
          
          for (const fmt of selectedFormats) {
            const maxDuration = MAX_VIDEO_DURATION[fmt];
            
            // Duration check
            if (maxDuration && videoInfo.duration > maxDuration) {
              issues.push({
                fileName: videoFile.name,
                issue: `Duração ${Math.round(videoInfo.duration)}s excede ${maxDuration}s para ${getFormatLabel(fmt)}`,
                suggestion: `Reduza para ≤ ${maxDuration}s ou remova ${getFormatLabel(fmt)}`,
                type: 'duration',
                severity: maxDuration <= 60 ? 'error' : 'warning',
              });
            }
            
            // Aspect ratio mismatch checks
            if (fmt === 'youtube_video' && isVertical) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo vertical (${videoInfo.width}x${videoInfo.height}) não é adequado para YouTube Feed`,
                suggestion: 'Use YouTube Shorts para vídeos verticais 9:16',
                type: 'aspectRatio',
                severity: 'error',
              });
            }
            if (fmt === 'youtube_shorts' && isHorizontal) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo horizontal não é adequado para Shorts`,
                suggestion: 'Use YouTube Vídeo para vídeos 16:9',
                type: 'aspectRatio',
                severity: 'error',
              });
            }
            // Vertical formats receiving horizontal video
            const verticalFormats = ['instagram_reel', 'tiktok_video', 'facebook_reel'];
            if (verticalFormats.includes(fmt) && isHorizontal) {
              issues.push({
                fileName: videoFile.name,
                issue: `Vídeo horizontal (${videoInfo.width}x${videoInfo.height}) não é ideal para ${getFormatLabel(fmt)}`,
                suggestion: 'Use um vídeo vertical 9:16 para melhores resultados',
                type: 'aspectRatio',
                severity: 'warning',
              });
            }
            
            // Resolution check
            const minRes = MIN_RESOLUTIONS[fmt];
            if (minRes && (videoInfo.width < minRes.width * 0.7 || videoInfo.height < minRes.height * 0.7)) {
              issues.push({
                fileName: videoFile.name,
                issue: `Resolução ${videoInfo.width}x${videoInfo.height} baixa para ${getFormatLabel(fmt)}`,
                suggestion: `Recomendado: ${minRes.width}x${minRes.height}px`,
                type: 'resolution',
                severity: 'warning',
              });
            }
          }
        } catch (err) {
          console.warn('Could not validate video:', videoFile.name, err);
        }
      }
      
      // If there are video validation issues, show modal
      if (issues.length > 0) {
        setPendingVideoFiles(newFiles);
        setVideoValidationIssues(issues);
        setVideoValidationModalOpen(true);
        return; // Wait for user confirmation
      }
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    
    // Detect aspect ratios for new files
    const newAspectRatios: string[] = [];
    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        const ratio = await detectImageAspectRatio(file);
        newAspectRatios.push(ratio);
      } else if (file.type.startsWith('video/')) {
        const ratio = await detectVideoAspectRatio(file);
        newAspectRatios.push(ratio);
      } else {
        newAspectRatios.push('auto');
      }
    }
    
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

    // APPEND new files to existing ones instead of replacing
    const combinedFiles = [...mediaFiles, ...newFiles];
    const combinedUrls = [...mediaPreviewUrls, ...newUrls];
    
    setMediaFiles(combinedFiles);
    setMediaPreviewUrls(combinedUrls);
    setMediaSources(prev => [...prev, ...Array(newFiles.length).fill('upload' as MediaSource)]);
    setMediaAspectRatios(prev => [...prev, ...newAspectRatios]);
    
    // Validate ALL media for selected formats
    if (selectedFormats.length > 0) {
      const validations: MediaValidationResult[] = [];
      for (const file of combinedFiles) {
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
    
    toast.success(`${newFiles.length} ficheiro(s) adicionado(s). Total: ${combinedFiles.length}`);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setMediaSources(prev => prev.filter((_, i) => i !== index));
    setMediaAspectRatios(prev => prev.filter((_, i) => i !== index));
  };

  // Handle video validation continue
  const handleVideoValidationContinue = async () => {
    setVideoValidationModalOpen(false);
    const filesToAdd = pendingVideoFiles;
    setPendingVideoFiles([]);
    setVideoValidationIssues([]);
    
    // Proceed with adding the files
    setIsUploading(true);
    setUploadProgress(0);

    const newUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    // Detect aspect ratios for new files
    const newAspectRatios: string[] = [];
    for (const file of filesToAdd) {
      if (file.type.startsWith('image/')) {
        const ratio = await detectImageAspectRatio(file);
        newAspectRatios.push(ratio);
      } else if (file.type.startsWith('video/')) {
        const ratio = await detectVideoAspectRatio(file);
        newAspectRatios.push(ratio);
      } else {
        newAspectRatios.push('auto');
      }
    }
    
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

    const combinedFiles = [...mediaFiles, ...filesToAdd];
    const combinedUrls = [...mediaPreviewUrls, ...newUrls];
    
    setMediaFiles(combinedFiles);
    setMediaPreviewUrls(combinedUrls);
    setMediaSources(prev => [...prev, ...Array(filesToAdd.length).fill('upload' as MediaSource)]);
    setMediaAspectRatios(prev => [...prev, ...newAspectRatios]);
    
    toast.success(`${filesToAdd.length} ficheiro(s) adicionado(s) com avisos. Total: ${combinedFiles.length}`);
  };

  const handleVideoValidationCancel = () => {
    setVideoValidationModalOpen(false);
    setPendingVideoFiles([]);
    setVideoValidationIssues([]);
    toast.info('Upload cancelado');
  };

  const handleSaveDraft = async () => {
    if (selectedFormats.length === 0) {
      toast.error('Selecione pelo menos um formato');
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(0);

      // Robust session check
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('[handleSaveDraft] Session error:', sessionError);
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }
      const user = sessionData.session.user;

      const mediaUrls: string[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = mediaFiles[i];
        const fileName = generateSafeStoragePath(user.id, file);
        
        setUploadProgress(Math.round((i / totalFiles) * 100));
        
        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('[handleSaveDraft] Upload error:', uploadError);
          throw uploadError;
        }
        
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

      const draftData: any = {
        user_id: user.id,
        platform,
        caption: useSeparateCaptions && networkCaptions[platform.replace('_carrousel', '')] 
          ? networkCaptions[platform.replace('_carrousel', '')] 
          : caption,
        media_urls: mediaUrls,
        scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
        scheduled_time: time || null,
        publish_immediately: scheduleAsap,
        status: 'draft',
      };

      // Validate currentDraftId - if it's an invalid autosave ID, force insert
      const validDraftId = currentDraftId && !currentDraftId.startsWith('autosave-') ? currentDraftId : null;

      if (validDraftId) {
        const { error } = await supabase
          .from('posts_drafts')
          .update(draftData)
          .eq('id', validDraftId);
        if (error) {
          console.error('[handleSaveDraft] Update error:', error);
          throw error;
        }
        toast.success('Rascunho atualizado com sucesso');
      } else {
        const { data: insertedDraft, error } = await supabase.from('posts_drafts').insert(draftData).select('id').single();
        if (error) {
          console.error('[handleSaveDraft] Insert error:', error);
          throw error;
        }
        // Clear invalid autosave ID if it existed
        if (currentDraftId && currentDraftId.startsWith('autosave-')) {
          setCurrentDraftId(null);
        }
        toast.success('Rascunho guardado com sucesso');
        
        // Register media in library after successful draft save
        if (mediaUrls.length > 0) {
          const mediaEntries = mediaUrls.map((url, idx) => {
            const fileName = url.split('/').pop() || `draft-${idx}`;
            const file = mediaFiles[idx];
            const isVideo = file?.type?.startsWith('video/') || url.includes('.mp4') || url.includes('.mov');
            return {
              user_id: user.id,
              file_name: fileName,
              file_url: url,
              file_type: isVideo ? 'video' : 'image',
              source: 'publication',
              is_favorite: false,
            };
          });
          
          const { error: mediaError } = await supabase.from('media_library').insert(mediaEntries);
          if (mediaError) {
            console.warn('[handleSaveDraft] Failed to register media in library:', mediaError);
          } else {
            console.log(`[handleSaveDraft] Registered ${mediaEntries.length} files in media library`);
          }
        }
      }
    } catch (error: any) {
      console.error('[handleSaveDraft] Error details:', {
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
        details: error?.details,
        hint: error?.hint,
        name: error?.name,
        stack: error?.stack,
      });
      
      if (error?.message?.includes('uuid')) {
        toast.error('Erro interno. O rascunho será guardado como novo.');
        setCurrentDraftId(null);
      } else if (error?.message?.includes('JWT') || error?.message?.includes('session') || error?.code === 'PGRST301') {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error?.message?.includes('storage') || error?.message?.includes('bucket') || error?.statusCode === 413) {
        toast.error('Erro no upload. Verifique o tamanho dos ficheiros (máx 50MB).');
      } else if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
        toast.error('Ligação lenta. Tente novamente com ficheiros mais pequenos.');
      } else if (error?.statusCode === 403) {
        toast.error('Sem permissão para guardar. Contacte o suporte.');
      } else {
        toast.error(`Erro ao guardar: ${error?.message || 'Verifique a sua ligação.'}`);
      }
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  // Handler for cancelling publication
  const handleCancelPublishing = async () => {
    try {
      setIsCancellingPublish(true);
      
      // 1. Cancel the publishing process
      cancelPublishing();
      
      // 2. Save as draft automatically (if we have content)
      if (selectedFormats.length > 0 || mediaFiles.length > 0) {
        await handleSaveDraft();
      }
      
      // 3. Show success toast
      toast.success('Publicação cancelada', {
        description: 'O teu conteúdo foi guardado como rascunho. Podes editar e publicar quando quiseres.',
        duration: 5000,
      });
      
      // 4. Reset progress
      resetProgress();
    } catch (error) {
      console.error('[handleCancelPublishing] Error:', error);
      toast.error('Erro ao cancelar. Tenta novamente.');
    } finally {
      setIsCancellingPublish(false);
    }
  };

  const handleLoadDraft = useCallback(async (draft: any) => {
    // Map platform back to format
    let format: PostFormat;
    if (draft.platform === 'instagram_carrousel') format = 'instagram_carousel';
    else if (draft.platform === 'instagram_stories') format = 'instagram_stories';
    else if (draft.platform === 'linkedin') format = 'linkedin_post';
    else if (draft.platform === 'linkedin_document') format = 'linkedin_document';
    else format = 'instagram_carousel';

    setSelectedFormats([format]);
    setCaption(draft.caption || '');
    setScheduleAsap(draft.publish_immediately ?? true);
    
    if (draft.scheduled_date) {
      setScheduledDate(new Date(draft.scheduled_date));
    }
    if (draft.scheduled_time) {
      setTime(draft.scheduled_time);
    }

    setCurrentDraftId(draft.id);

    // Load media from URLs and convert to Files
    const urls = draft.media_urls || [];
    if (urls.length > 0) {
      setMediaPreviewUrls(urls);
      setMediaSources(urls.map(() => 'url' as MediaSource));
      
      // Convert URLs to Files for proper publishing
      toast.info('A carregar ficheiros do rascunho...');
      const filePromises = urls.map((url: string) => fetchImageAsFile(url));
      const files = await Promise.all(filePromises);
      const validFiles = files.filter((f): f is File => f !== null);
      
      if (validFiles.length > 0) {
        setMediaFiles(validFiles);
        // Detect aspect ratios for each file
        const aspectRatios = await Promise.all(
          validFiles.map(file => 
            file.type.startsWith('video/') 
              ? detectVideoAspectRatio(file) 
              : detectImageAspectRatio(file)
          )
        );
        setMediaAspectRatios(aspectRatios);
        
        // Advance to appropriate step
        setVisitedSteps([1, 2, 3]);
        setCurrentStep(3);
        
        toast.success('Rascunho carregado!', {
          description: `${validFiles.length} ficheiros carregados`
        });
      } else {
        toast.warning('Não foi possível carregar os ficheiros do rascunho');
      }
    } else {
      // No media, just advance to step 2
      setVisitedSteps([1, 2]);
      setCurrentStep(2);
      toast.success('Rascunho carregado!');
    }
  }, [fetchImageAsFile]);

  // Load draft from sessionStorage (when coming from Drafts page)
  useEffect(() => {
    const savedDraft = sessionStorage.getItem('editDraft');
    if (savedDraft && !recoverPostId) {
      try {
        const draft = JSON.parse(savedDraft);
        sessionStorage.removeItem('editDraft'); // Clear after reading
        
        // Use the handleLoadDraft function to load the draft
        handleLoadDraft(draft);
      } catch (error) {
        console.error('Error loading draft from sessionStorage:', error);
        sessionStorage.removeItem('editDraft');
      }
    }
  }, [handleLoadDraft, recoverPostId]);

  const handleSubmitForApproval = async () => {
    // Smart-validation gate is the source of truth; legacy hasErrors kept as
    // safety net for edge cases (e.g. profile selection) not yet covered.
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de submeter');
      return;
    }
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
        const fileName = generateSafeStoragePath(user.id, file);
        
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
          caption: useSeparateCaptions && networkCaptions[platform] ? networkCaptions[platform] : caption,
          media_urls: mediaUrls,
          scheduled_date: scheduledDateStr || undefined,
          scheduled_time: scheduledTimeStr || undefined,
          publish_immediately: scheduleAsap,
          formats: selectedFormats,
          network_captions: useSeparateCaptions ? networkCaptions : undefined,
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
        linkedin_body: useSeparateCaptions && networkCaptions.linkedin ? networkCaptions.linkedin : null,
        scheduled_date: scheduledDate?.toISOString() || null,
        schedule_asap: scheduleAsap,
        status: 'waiting_for_approval',
        origin_mode: 'manual',
        tema: 'Manual post',
        template_a_images: mediaUrls,
        template_b_images: [],
        workflow_id: 'manual-' + Date.now(),
      };

      console.log('[ManualCreate] Inserting post with user_id:', user.id);
      const { error: dbError } = await supabase.from('posts').insert(postData);
      if (dbError) {
        console.error('DB insert error:', dbError);
        toast.error('Erro ao guardar publicação na base de dados');
      } else {
        // Register media in library after successful post insertion
        if (mediaUrls.length > 0) {
          const mediaEntries = mediaUrls.map((url, idx) => {
            const fileName = url.split('/').pop() || `media-${idx}`;
            const file = mediaFiles[idx];
            const isVideo = file?.type?.startsWith('video/') || url.includes('.mp4') || url.includes('.mov');
            return {
              user_id: user.id,
              file_name: fileName,
              file_url: url,
              file_type: isVideo ? 'video' : 'image',
              source: 'publication',
              is_favorite: false,
            };
          });
          
          const { error: mediaError } = await supabase.from('media_library').insert(mediaEntries);
          if (mediaError) {
            console.warn('[ManualCreate] Failed to register media in library:', mediaError);
            // Don't show error - the main action succeeded
          } else {
            console.log(`[ManualCreate] Registered ${mediaEntries.length} files in media library`);
          }
        }
      }

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

  const handlePublishNow = async (filesToPublish?: File[]) => {
    // Smart-validation gate is the source of truth.
    if (selectedFormats.length > 0 && !smartValidation.canPublish) {
      setValidationSheetOpen(true);
      toast.error('Resolve os problemas no painel de validação antes de publicar');
      return;
    }
    if (hasErrors) {
      const errorMsg = validationErrors.join(', ');
      toast.error(`Corrija os erros: ${errorMsg}`, { duration: 5000 });
      return;
    }

    const files = filesToPublish || mediaFiles;
    
    // Check for oversized images (> 4MB) - only for Instagram
    const instagramSelected = selectedNetworks.includes('instagram');
    if (instagramSelected && !filesToPublish) {
      const oversized = detectOversizedImages(files, 4);
      if (oversized.length > 0) {
        setOversizedImages(oversized);
        setCompressionModalOpen(true);
        return; // Wait for user confirmation
      }
    }

    // Log quota info for reference only - Getlate.dev is the sole authority for quota limits
    console.log('[Publish] Quota info (reference only):', {
      instagramRemaining: instagram.quota.remaining,
      linkedinRemaining: linkedin.quota.remaining,
      isUnlimited,
    });
    
    // NOTE: No frontend quota blocking - Getlate.dev API will reject if quota is exceeded

    // Use the new hook to publish
    const publishParams = {
      formats: selectedFormats,
      caption,
      mediaFiles: files,
      scheduledDate,
      time,
      scheduleAsap,
      recoveredFromPostId: recoveredPostId || undefined,
      networkCaptions: useSeparateCaptions ? networkCaptions : undefined,
    };
    
    const result = await executePublish(publishParams);

    // Handle duplicate detection
    if (result && typeof result === 'object' && 'duplicate' in result) {
      setDuplicateWarning(result.duplicate);
      setPendingPublishParams(publishParams);
      return;
    }

    if (result === true) {
      await refreshQuota();
    }
  };

  // Handle compression confirmation - Step 1: Start compression
  const handleConfirmCompression = async () => {
    setIsCompressing(true);
    setCompressionStep('compressing');
    
    try {
      const indicesToCompress = oversizedImages.map(img => img.index);
      
      const { files: compressedFiles, results } = await compressOversizedFiles(
        mediaFiles,
        indicesToCompress,
        4,
        (current, total, fileName) => {
          setCompressionProgress({ current, total, fileName });
        }
      );
      
      // Store results for confirmation step (DON'T close modal yet)
      setPendingCompressedFiles(compressedFiles);
      setCompressionResults(results);
      setIsCompressing(false);
      
      // Move to confirmation step
      setCompressionStep('confirmation');
      
    } catch (error) {
      console.error('[ManualCreate] Compression failed:', error);
      toast.error('Erro ao comprimir imagens');
      setIsCompressing(false);
      setCompressionProgress(undefined);
      setCompressionStep('warning');
    }
  };

  // Handle compression confirmation - Step 2: Confirm and publish
  const handleConfirmAndPublish = async () => {
    // Update media files with compressed versions
    setMediaFiles(pendingCompressedFiles);
    
    // Close modal and reset state
    setCompressionModalOpen(false);
    setOversizedImages([]);
    setCompressionStep('warning');
    setCompressionResults([]);
    setCompressionProgress(undefined);
    
    // Show success message
    const totalSaved = compressionResults.reduce((acc, r) => acc + (r.originalSizeMB - r.finalSizeMB), 0);
    toast.success(`${compressionResults.length} imagem(ns) comprimida(s)`, {
      description: `Poupou ${totalSaved.toFixed(1)}MB`
    });
    
    // Continue with publishing using compressed files
    await handlePublishNow(pendingCompressedFiles);
    
    // Clear pending files after publishing started
    setPendingCompressedFiles([]);
  };

  const handleCancelCompression = () => {
    if (!isCompressing) {
      // If in confirmation step, go back to warning
      if (compressionStep === 'confirmation') {
        setCompressionStep('warning');
        setCompressionResults([]);
        setPendingCompressedFiles([]);
      } else {
        // Close completely
        setCompressionModalOpen(false);
        setOversizedImages([]);
        setCompressionStep('warning');
      }
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
    
    if (network === 'googlebusiness') {
      return <GoogleBusinessPreview 
        mediaUrls={mediaPreviewUrls} 
        caption={caption} 
        format={format as 'googlebusiness_post' | 'googlebusiness_media'} 
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
      case 'googlebusiness': return MapPin;
      default: return FileText;
    }
  };

  // State for mobile preview collapsed
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  return (
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 px-0 sm:px-6 lg:px-0 bg-gradient-to-br from-background to-background-secondary overflow-hidden w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between py-1 sm:py-2 gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/?tab=create')}
          className="gap-1.5 px-2 -ml-1 sm:ml-0 h-8 sm:h-9"
          aria-label="Voltar à página anterior"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <CompactModeBadge mode="manual" onChangeMode={() => navigate('/?tab=create')} />
      </div>

      {/* Recovery Banner */}
      {isRecovering && (
        <div className="flex items-center gap-2 p-3 mx-2 sm:mx-0 rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span className="text-sm">A recuperar conteúdo...</span>
        </div>
      )}
      
      {recoveredPostId && !isRecovering && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 mx-2 sm:mx-0">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                  Conteúdo Recuperado
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  {mediaFiles.length} ficheiro(s) carregado(s) do post anterior
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setRecoveredPostId(null);
                  setMediaPreviewUrls([]);
                  setMediaFiles([]);
                  setMediaSources([]);
                  setMediaAspectRatios([]);
                  setCaption('');
                  setSelectedFormats([]);
                  setNetworkCaptions({});
                  setUseSeparateCaptions(false);
                  navigate('/manual-create', { replace: true });
                  toast.success('Recuperação limpa');
                }}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800/50 -mr-2"
              >
                Limpar
              </Button>
            </div>
            
            {/* Preview grid of recovered images */}
            {mediaPreviewUrls.length > 0 && (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mt-3">
                {mediaPreviewUrls.slice(0, 7).map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden group bg-muted">
                    {mediaFiles[i]?.type.startsWith('video/') ? (
                      <video src={url} className="object-cover w-full h-full" muted />
                    ) : (
                      <img src={url} alt={`Recuperado ${i + 1}`} className="object-cover w-full h-full" />
                    )}
                    <button 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remove this specific media
                        setMediaPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
                        setMediaFiles(prev => prev.filter((_, idx) => idx !== i));
                        setMediaSources(prev => prev.filter((_, idx) => idx !== i));
                        setMediaAspectRatios(prev => prev.filter((_, idx) => idx !== i));
                        toast.success('Imagem removida');
                      }}
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                {mediaPreviewUrls.length > 7 && (
                  <div className="aspect-square rounded-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
                    +{mediaPreviewUrls.length - 7}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quota Warning - simplified on mobile */}
      {selectedNetworks.length > 0 && !isUnlimited && (
        (selectedNetworks.includes('instagram') && instagram.percentage >= 80) ||
        (selectedNetworks.includes('linkedin') && linkedin.percentage >= 80)
      ) && (
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 mx-2 sm:mx-0 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="text-[11px] sm:text-sm truncate">
            {selectedNetworks.includes('instagram') && instagram.percentage >= 100 && 'Quota IG esgotada'}
            {selectedNetworks.includes('linkedin') && linkedin.percentage >= 100 && 'Quota LI esgotada'}
            {((selectedNetworks.includes('instagram') && instagram.percentage >= 80 && instagram.percentage < 100) ||
              (selectedNetworks.includes('linkedin') && linkedin.percentage >= 80 && linkedin.percentage < 100)) && 
              'Quota quase esgotada'}
          </span>
        </div>
      )}

      {/* Stepper - more compact on mobile */}
      <div className="sm:px-0">
        <StepProgress
          currentStep={currentStep}
          visitedSteps={visitedSteps}
          onStepClick={goToStep}
        />
      </div>

      {/* Mobile Preview - Hidden by default, moved to bottom */}

      <div className="grid lg:grid-cols-2 gap-2 lg:gap-8 pb-32 lg:pb-0 px-0 sm:px-0 overflow-hidden">
        {/* Left - Form */}
        <div className="space-y-3 lg:space-y-6">
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
            showStep2 ? "opacity-100" : "opacity-0 max-h-0"
          )}>
            <Card className="border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full overflow-hidden">

              <CardHeader className="pb-1 sm:pb-3 px-1.5 xs:px-2 sm:px-6 pt-1.5 xs:pt-2 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm xs:text-base sm:text-lg flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                    <CloudUpload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span>Média</span>
                    <SectionHelp content={getSectionTooltip('media')} />
                  </CardTitle>
                  <AutoSaveIndicator 
                    lastSaved={lastSaved} 
                    isSaving={isAutoSaving} 
                    hasUnsavedChanges={hasUnsavedChanges} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 xs:space-y-3 sm:space-y-4 px-1.5 xs:px-2 sm:px-6 pb-3 xs:pb-4 sm:pb-6">
                {/* 3 Card Upload Options - Vertical Stack */}
                {mediaPreviewUrls.length === 0 && (
                  <div ref={mediaSectionRef}>
                    <MediaUploadSection
                      onAddToCarousel={(files: File[], source: MediaSource) => {
                        const newUrls = files.map(f => URL.createObjectURL(f));
                        const remainingSlots = mediaRequirements.maxMedia - mediaPreviewUrls.length;
                        const filesToAdd = files.slice(0, remainingSlots);
                        const urlsToAdd = newUrls.slice(0, remainingSlots);
                        
                        setMediaFiles(prev => [...prev, ...filesToAdd]);
                        setMediaPreviewUrls(prev => [...prev, ...urlsToAdd]);
                        setMediaSources(prev => [...prev, ...Array(filesToAdd.length).fill(source)]);
                        
                        toast.success(`${filesToAdd.length} imagem(s) adicionada(s) ao carrossel`);
                        
                        setTimeout(() => {
                          mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      maxImages={selectedFormats.includes('instagram_carousel') ? 50 - mediaPreviewUrls.length : mediaRequirements.maxMedia - mediaPreviewUrls.length}
                      disabled={saving || submitting || isUploading}
                      selectedFormats={selectedFormats}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onFileUpload={handleMediaUpload}
                      getAcceptTypes={getAcceptTypes}
                    />
                  </div>
                )}
                
                {/* Hidden Grid Splitter when media exists (for adding more via grid) */}
                {mediaPreviewUrls.length > 0 && (
                  <div ref={mediaSectionRef}>
                    <GridSplitter
                      onAddToCarousel={(files: File[], source: MediaSource) => {
                        const newUrls = files.map(f => URL.createObjectURL(f));
                        const remainingSlots = mediaRequirements.maxMedia - mediaPreviewUrls.length;
                        const filesToAdd = files.slice(0, remainingSlots);
                        const urlsToAdd = newUrls.slice(0, remainingSlots);
                        
                        setMediaFiles(prev => [...prev, ...filesToAdd]);
                        setMediaPreviewUrls(prev => [...prev, ...urlsToAdd]);
                        setMediaSources(prev => [...prev, ...Array(filesToAdd.length).fill(source)]);
                        
                        toast.success(`${filesToAdd.length} imagem(s) adicionada(s) ao carrossel`);
                      }}
                      maxImages={selectedFormats.includes('instagram_carousel') ? 50 - mediaPreviewUrls.length : mediaRequirements.maxMedia - mediaPreviewUrls.length}
                      disabled={saving || submitting || isUploading}
                      selectedFormats={selectedFormats}
                    />
                  </div>
                )}
                
                {/* Media Grid - With Files */}
                {mediaPreviewUrls.length > 0 && (
                  <div className="space-y-3">
                    {/* Persistent Action Bar - Always visible with clear add more option */}
                    <div className={cn(
                      "flex items-center justify-between p-2 xs:p-2.5 sm:p-3 rounded-lg border",
                      mediaPreviewUrls.length >= mediaRequirements.maxMedia 
                        ? "bg-amber-500/10 border-amber-500/30" 
                        : "bg-muted/50 border-border"
                    )}>
                      <div className="flex items-center gap-1.5 xs:gap-2">
                        <span className={cn(
                          "text-xs sm:text-sm font-medium",
                          mediaPreviewUrls.length >= mediaRequirements.maxMedia && "text-amber-700 dark:text-amber-300"
                        )}>
                          {mediaPreviewUrls.length}/{mediaRequirements.maxMedia}
                        </span>
                        {mediaPreviewUrls.length < mediaRequirements.maxMedia ? (
                          <Badge variant="secondary" className="text-[10px] hidden xs:inline-flex">
                            +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] xs:text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            Limite
                          </Badge>
                        )}
                      </div>
                      
                      {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                        <Label htmlFor="media-upload-header" className="cursor-pointer">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            asChild
                            className="gap-1 h-8 xs:h-9 px-2 xs:px-3"
                          >
                            <span>
                              <Plus className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                              <span className="text-xs">Mais</span>
                            </span>
                          </Button>
                          <Input
                            id="media-upload-header"
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
                    
                    {/* Drag hint for first-time users */}
                    {mediaPreviewUrls.length > 1 && (
                      <DragHintTooltip show={mediaPreviewUrls.length > 1} />
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="hidden sm:inline">Arraste para reordenar ou use as setas</span>
                        <span className="sm:hidden">Pressione e arraste • Use ↑↓</span>
                      </span>
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-3">
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
                                source={mediaSources[idx]}
                                aspectRatio={mediaAspectRatios[idx] as any}
                                onRemove={() => removeMedia(idx)}
                                onMoveUp={() => moveMedia(idx, idx - 1)}
                                onMoveDown={() => moveMedia(idx, idx + 1)}
                              />
                            );
                          })}
                          
                          {/* Add More Button - Enhanced visibility */}
                          {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                            <Label 
                              htmlFor="media-upload-more"
                              className={cn(
                                "aspect-square rounded-lg xs:rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 xs:gap-1.5 cursor-pointer transition-all press-effect",
                                "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10",
                                "min-h-[100px]"
                              )}
                            >
                              <div className="p-2 rounded-full bg-primary/20">
                                <Plus className="h-5 w-5 text-primary" />
                              </div>
                              <span className="text-xs font-medium text-primary">
                                +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
                              </span>
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
            "transition-all duration-300 ease-out overflow-hidden space-y-3 sm:space-y-6",
            showStep3 ? "opacity-100" : "opacity-0 max-h-0"
          )}>
            {/* Caption */}
            <Card className="border-0 sm:border shadow-none sm:shadow-sm">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                  Legenda
                  <SectionHelp content={getSectionTooltip('caption')} />
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {!useSeparateCaptions && (
                    <>
                      <span className={cn(
                        "font-medium",
                        captionLength > maxLength * 0.9 && captionLength <= maxLength && "text-orange-500",
                        captionLength > maxLength && "text-destructive"
                      )}>
                        {captionLength}/{maxLength}
                      </span>
                      {' '}caracteres
                    </>
                  )}
                  {selectedNetworks.includes('linkedin') && <span className="hidden sm:inline"> (obrigatório para LinkedIn)</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-4 sm:pb-6">
                <NetworkCaptionEditor
                  caption={caption}
                  onCaptionChange={setCaption}
                  networkCaptions={networkCaptions}
                  onNetworkCaptionChange={(network, value) => {
                    setNetworkCaptions(prev => ({ ...prev, [network]: value }));
                  }}
                  selectedNetworks={selectedNetworks}
                  useSeparateCaptions={useSeparateCaptions}
                  onToggleSeparate={(value) => {
                    setUseSeparateCaptions(value);
                    // Initialize network captions with unified caption when enabling
                    if (value) {
                      const initial: Record<string, string> = {};
                      selectedNetworks.forEach(network => {
                        initial[network] = networkCaptions[network] || caption;
                      });
                      setNetworkCaptions(initial);
                    }
                  }}
                  disabled={saving || submitting || publishing}
                  onOpenSavedCaptions={() => setSavedCaptionsOpen(true)}
                  onOpenAIDialog={() => setAiDialogOpen(true)}
                />
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card className="border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full overflow-hidden">
              <CardHeader className="px-1.5 xs:px-2 sm:px-6 pt-1.5 xs:pt-2 sm:pt-6 pb-1 xs:pb-1.5 sm:pb-4">
                <CardTitle className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-sm xs:text-base sm:text-lg">
                  Agendamento
                  <SectionHelp content={getSectionTooltip('scheduling')} />
                </CardTitle>
                <CardDescription className="text-[10px] xs:text-xs sm:text-sm">Defina quando publicar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 xs:space-y-3 sm:space-y-4 px-2 xs:px-3 sm:px-6 pb-3 xs:pb-4 sm:pb-6">
                {/* Toggle Pill Style */}
                <div className="flex rounded-full bg-muted p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setScheduleAsap(true)}
                    className={cn(
                      "flex-1 py-1.5 xs:py-2 px-1.5 xs:px-2 sm:px-4 rounded-full text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2",
                      scheduleAsap 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Rocket className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Publicar agora</span>
                    <span className="xs:hidden">Agora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleAsap(false)}
                    className={cn(
                      "flex-1 py-1.5 xs:py-2 px-1.5 xs:px-2 sm:px-4 rounded-full text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2",
                      !scheduleAsap 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
                    Agendar
                  </button>
                </div>
                
                {scheduleAsap ? (
                  <div className="text-center py-3 space-y-2">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                      <Rocket className="h-4 w-4 text-primary" />
                      <span>Publicação imediata após clicares em Publicar</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {/* Timezone indicator */}
                    <div className="flex items-center justify-center gap-1 xs:gap-2 text-[9px] xs:text-xs text-muted-foreground bg-muted/40 px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg flex-wrap">
                      <Globe className="h-3 w-3" />
                      <span className="hidden xs:inline">Fuso: </span>
                      <strong className="text-foreground">Lisboa</strong>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{format(new Date(), 'HH:mm', { locale: pt })}</span>
                    </div>

                    {/* Quick date shortcuts */}
                    <div className="space-y-2">
                      <Label className="text-[10px] xs:text-xs text-muted-foreground">Atalhos rápidos</Label>
                      <div className="grid grid-cols-2 gap-1 xs:gap-1.5">
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setScheduledDate(new Date())}
                          className={cn(
                            "text-[9px] xs:text-[10px] sm:text-xs h-7 xs:h-8",
                            scheduledDate && format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-primary/10 border-primary/50"
                          )}
                        >
                          Hoje
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setScheduledDate(addDays(new Date(), 1))}
                          className={cn(
                            "text-[9px] xs:text-[10px] sm:text-xs h-7 xs:h-8",
                            scheduledDate && format(scheduledDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') && "bg-primary/10 border-primary/50"
                          )}
                        >
                          Amanhã
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setScheduledDate(nextDay(new Date(), 2))}
                          className={cn(
                            "text-[9px] xs:text-[10px] sm:text-xs h-7 xs:h-8",
                            scheduledDate && scheduledDate.getDay() === 2 && scheduledDate > new Date() && "bg-primary/10 border-primary/50"
                          )}
                        >
                          Terça
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setScheduledDate(nextDay(new Date(), 4))}
                          className={cn(
                            "text-[10px] xs:text-xs h-8",
                            scheduledDate && scheduledDate.getDay() === 4 && scheduledDate > new Date() && "bg-primary/10 border-primary/50"
                          )}
                        >
                          Quinta
                        </Button>
                      </div>
                    </div>
                    
                    {/* Date picker */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "w-full justify-start text-left font-normal h-11",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {scheduledDate ? (
                              <span className="capitalize">{format(scheduledDate, "EEEE, d 'de' MMMM", { locale: pt })}</span>
                            ) : (
                              'Escolher data'
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Time picker with presets */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Hora</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select 
                          value={time.split(':')[0]} 
                          onValueChange={(hour) => setTime(`${hour}:${time.split(':')[1] || '00'}`)}
                        >
                          <SelectTrigger className="h-11">
                            <Clock className="h-4 w-4 mr-2 text-primary" />
                            <SelectValue placeholder="Hora" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i).padStart(2, '0')}>
                                {String(i).padStart(2, '0')}h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={time.split(':')[1] || '00'} 
                          onValueChange={(min) => setTime(`${time.split(':')[0]}:${min}`)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="00">00 min</SelectItem>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Time presets */}
                      <div className="overflow-x-auto scrollbar-hide pb-1">
                        <div className="flex gap-1 xs:gap-1.5 w-max xs:w-auto xs:flex-wrap mt-2">
                          {['09:00', '12:00', '15:00', '18:00', '21:00'].map((preset) => (
                            <Badge 
                              key={preset}
                              variant="outline" 
                              className={cn(
                                "cursor-pointer hover:bg-primary/10 transition-colors text-[10px] xs:text-xs py-0.5 xs:py-1 px-1.5 xs:px-2 flex-shrink-0",
                                time === preset && "bg-primary/10 border-primary/50"
                              )}
                              onClick={() => setTime(preset)}
                            >
                              {preset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Scheduled preview */}
                    {scheduledDate && time && (
                      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          Agendado para:
                        </div>
                        <div className="text-base font-semibold capitalize">
                          {format(scheduledDate, "EEEE, d 'de' MMMM 'às'", { locale: pt })} {time}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fuso horário de Lisboa (WET/WEST)
                        </p>
                      </div>
                    )}
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

            {/* Actions - Reorganized Hierarchy - Hidden on mobile (use bottom bar) */}
            <Card className="hidden sm:block lg:sticky lg:bottom-4 bg-card/95 backdrop-blur-sm border-2 shadow-lg">
              <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                {(saving || submitting || publishing) && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">
                        {saving ? 'A guardar...' : publishing ? 'A publicar...' : 'A submeter...'}
                      </span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* Smart Pre-Validation Panel (real-time) */}
                {selectedFormats.length > 0 && (
                  <ValidationSidebar
                    validation={smartValidation}
                    mediaFiles={mediaFiles}
                  />
                )}
                
                {/* Primary Actions Row */}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handlePublishWithValidation}
                    disabled={publishing || submitting || saving || isUploading || (selectedFormats.length > 0 && !smartValidation.canPublish)}
                    className={cn(
                      "flex-1 font-semibold text-white",
                      // Dynamic color: blue for scheduled, green for immediate
                      !scheduleAsap && scheduledDate
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                        : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400",
                      "hover:shadow-lg active:scale-[0.98] transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label={!scheduleAsap && scheduledDate ? "Agendar publicação" : "Publicar agora"}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {!scheduleAsap && scheduledDate ? 'A agendar...' : 'A publicar...'}
                      </>
                    ) : (
                      <>
                        {!scheduleAsap && scheduledDate ? (
                          <>
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Agendar para {format(scheduledDate, "d 'de' MMM", { locale: pt })}
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Publicar Agora
                          </>
                        )}
                      </>
                    )}
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

        {/* Right - Preview - HIDDEN on mobile */}
        <div className="hidden lg:block lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-auto">
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

      {/* Mobile Sticky Bottom Bar - Enhanced with progress indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50 w-screen max-w-[100vw] overflow-hidden">
        {/* Mini progress indicator - mais compacto */}
        <div className="flex justify-center py-1 xs:py-1.5 border-b border-border/50">
          <div className="flex items-center gap-1 xs:gap-1.5">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-1 xs:h-1.5 rounded-full transition-all duration-200",
                  step <= currentStep ? "w-5 xs:w-6 bg-primary" : "w-1 xs:w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
        
        {/* Scheduled preview - if date selected */}
        {!scheduleAsap && scheduledDate && (
          <div className="px-2 xs:px-4 py-1 xs:py-1.5 bg-blue-50 dark:bg-blue-950/30 text-center text-[10px] xs:text-xs text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1 xs:gap-1.5">
            <CalendarIcon className="h-3 w-3" />
            <span>Agendado: {format(scheduledDate, "d MMM", { locale: pt })} às {time}</span>
          </div>
        )}
        
        {/* Validation badge - Mobile (only when formats selected) */}
        {selectedFormats.length > 0 && (
          <div className="flex justify-center py-0.5 xs:py-1">
            <ValidationMobileBadge
              validation={smartValidation}
              onClick={() => setValidationSheetOpen(true)}
            />
          </div>
        )}

        {/* Action buttons - com safe area */}
        <div className="p-2 xs:p-2.5 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex gap-2 xs:gap-2.5 sm:gap-3 w-full max-w-full">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSaveDraft}
            disabled={saving || submitting || publishing}
            className="h-11 w-11 xs:h-12 xs:w-12 sm:h-12 sm:w-12 flex-shrink-0"
            aria-label="Guardar rascunho"
          >
            <Save className="h-5 w-5 xs:h-5 xs:w-5 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            type="button"
            onClick={handlePublishWithValidation}
            disabled={publishing || submitting || saving || isUploading || selectedFormats.length === 0}
            className={cn(
              "flex-1 h-11 xs:h-12 sm:h-12 font-semibold text-white press-effect text-sm xs:text-base",
              !scheduleAsap && scheduledDate
                ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            )}
          >
            {publishing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : !scheduleAsap && scheduledDate ? (
              <>
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span>Agendar</span>
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 mr-2" />
                <span>Publicar</span>
              </>
            )}
          </Button>
          
          {/* Preview toggle for mobile */}
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={() => setMobilePreviewOpen(true)}
            className="h-11 w-11 xs:h-12 xs:w-12 sm:h-12 sm:w-12 flex-shrink-0"
            aria-label="Pré-visualizar"
          >
            <Eye className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Preview Drawer */}
      <Drawer open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-3">
            <DrawerTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pré-visualização
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            {selectedFormats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <Eye className="h-8 w-8 opacity-50" />
                <span>Selecione um formato para ver a pré-visualização</span>
              </div>
            ) : selectedFormats.length === 1 ? (
              <div className="space-y-4">
                {renderPreview(selectedFormats[0])}
                {scheduledDate && !scheduleAsap && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <Clock className="h-3 w-3" />
                    <span>Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}</span>
                  </div>
                )}
              </div>
            ) : (
              <Tabs value={activePreviewTab || selectedFormats[0]} onValueChange={setActivePreviewTab}>
                <TabsList className="w-full mb-4">
                  {selectedFormats.map(formatItem => {
                    const network = getNetworkFromFormat(formatItem);
                    const Icon = getNetworkIcon(network);
                    const config = getFormatConfig(formatItem);
                    return (
                      <TabsTrigger key={formatItem} value={formatItem} className="flex-1 gap-1">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs truncate">{config?.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {selectedFormats.map(formatItem => (
                  <TabsContent key={formatItem} value={formatItem}>
                    {renderPreview(formatItem)}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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

      {/* Image Compression Confirmation Modal */}
      <ImageCompressionConfirmModal
        open={compressionModalOpen}
        onClose={handleCancelCompression}
        onConfirm={handleConfirmCompression}
        onConfirmPublish={handleConfirmAndPublish}
        oversizedImages={oversizedImages}
        isCompressing={isCompressing}
        compressionProgress={compressionProgress}
        step={compressionStep}
        compressionResults={compressionResults}
        totalMediaCount={mediaFiles.length}
      />

      {/* Video Validation Modal */}
      <VideoValidationModal
        open={videoValidationModalOpen}
        onOpenChange={setVideoValidationModalOpen}
        issues={videoValidationIssues}
        onContinue={handleVideoValidationContinue}
        onCancel={handleVideoValidationCancel}
      />

      {/* Publish Progress Modal with 2 phases */}
      <PublishProgressModal
        isOpen={publishing || (publishProgress.phase2.status !== 'idle' && publishProgress.phase2.status !== 'waiting')}
        onClose={() => {
          if (!publishing) {
            resetProgress();
            setIsCancellingPublish(false);
          }
        }}
        progress={publishProgress}
        onCreateNew={handleCreateNew}
        onViewCalendar={handleViewCalendar}
        mediaFiles={mediaFiles}
        caption={caption}
        onCancel={handleCancelPublishing}
        isCancelling={isCancellingPublish}
      />

      {/* Duplicate Warning Dialog */}
      {duplicateWarning && (
        <DuplicateWarningDialog
          open={!!duplicateWarning}
          onOpenChange={(open) => {
            if (!open) {
              setDuplicateWarning(null);
              setPendingPublishParams(null);
            }
          }}
          duplicate={duplicateWarning}
          caption={pendingPublishParams?.caption}
          onConfirm={async () => {
            setDuplicateWarning(null);
            if (pendingPublishParams) {
              const result = await executePublish({ ...pendingPublishParams, skipDuplicateCheck: true });
              setPendingPublishParams(null);
              if (result === true) {
                await refreshQuota();
              }
            }
          }}
        />
      )}
    </div>
  );
}
