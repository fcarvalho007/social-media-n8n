import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PostFormat, getNetworkFromFormat } from '@/types/social';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { CompactModeBadge } from '@/components/CompactModeBadge';
import { DevHelper } from '@/components/DevHelper';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProgress } from '@/components/manual-post/StepProgress';
import { useAutoSave } from '@/hooks/useAutoSave';
import { MediaValidationResult } from '@/lib/mediaValidation';
import { renderFormatPreview, getNetworkIcon } from '@/lib/manual-create/previewRenderer';
import { RecoveryBanner } from '@/components/manual-post/steps/RecoveryBanner';
import { QuotaWarningBanner } from '@/components/manual-post/steps/QuotaWarningBanner';
import { MobileStickyActionBar } from '@/components/manual-post/steps/MobileStickyActionBar';
import { ManualCreateModals } from '@/components/manual-post/steps/ManualCreateModals';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Smartphone, ChevronRight } from 'lucide-react';
import { NetworkFormatSelector } from '@/components/manual-post/NetworkFormatSelector';
import { getMediaRequirements } from '@/lib/formatValidation';

import { useSmartValidation } from '@/hooks/useSmartValidation';
import { usePublishWithProgress } from '@/hooks/usePublishWithProgress';

import { useMediaManager } from '@/hooks/manual-create/useMediaManager';
import { useStepper } from '@/hooks/manual-create/useStepper';
import { useDraftRecovery } from '@/hooks/manual-create/useDraftRecovery';
import { useMediaUpload } from '@/hooks/manual-create/useMediaUpload';
import { useImageCompression } from '@/hooks/manual-create/useImageCompression';
import { usePublishOrchestrator } from '@/hooks/manual-create/usePublishOrchestrator';
import { Step2MediaCard } from '@/components/manual-post/steps/Step2MediaCard';
import { Step3CaptionCard } from '@/components/manual-post/steps/Step3CaptionCard';
import type { NetworkCaptionEditorHandle } from '@/components/manual-post/NetworkCaptionEditor';
import { NetworkOptionsCard, NetworkOptionsCardHandle } from '@/components/manual-post/steps/NetworkOptionsCard';
import { PublishActionsCard } from '@/components/manual-post/steps/PublishActionsCard';
import { Step3ScheduleCard } from '@/components/manual-post/steps/Step3ScheduleCard';
import { PreviewPanel } from '@/components/manual-post/steps/PreviewPanel';
import { createDefaultNetworkOptions, normalizeNetworkOptions } from '@/types/networkOptions';
import { detectImageAspectRatio as detectImageAspectRatioExt, detectVideoAspectRatio as detectVideoAspectRatioExt } from '@/hooks/manual-create/mediaAspectDetection';
import { AiUploadAssistantCard } from '@/components/manual-post/ai/AiUploadAssistantCard';
import type { EditorialAssistantResult } from '@/types/aiEditorial';
import { supabase } from '@/integrations/supabase/client';
// `extractVideoFrame` foi consolidado em '@/lib/media/videoFrameExtractor'.
// Este componente já não o usava localmente.

// Aspect-ratio helpers were moved to '@/hooks/manual-create/mediaAspectDetection'.
// Local aliases keep call sites unchanged inside this file.
const detectImageAspectRatio = detectImageAspectRatioExt;
const detectVideoAspectRatio = detectVideoAspectRatioExt;

const getMediaSignature = (files: File[]) =>
  files.map((file) => `${file.name}:${file.size}:${file.type}:${file.lastModified}`).join('|');

const normalizeHashtag = (value: string) => {
  const clean = value
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}_]/gu, '');

  return clean ? `#${clean}` : '';
};

const getUniqueHashtags = (result: EditorialAssistantResult) => {
  const existing = new Set((result.base_caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((tag) => tag.toLowerCase()));
  const tags = [
    ...(result.hashtags?.reach ?? []),
    ...(result.hashtags?.niche ?? []),
    ...(result.hashtags?.brand ?? []),
  ];

  return Array.from(new Set(tags.map(normalizeHashtag).filter(Boolean)))
    .filter((tag) => !existing.has(tag.toLowerCase()));
};

export default function ManualCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recoverPostId = searchParams.get('recover');
  const { instagram, linkedin, canPublish, refresh: refreshQuota, isUnlimited } = usePublishingQuota();
  const [selectedFormats, setSelectedFormats] = useState<PostFormat[]>([]);
  const [caption, setCaption] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [time, setTime] = useState('12:00');
  const [scheduleAsap, setScheduleAsap] = useState(true);
  // `saving` e `submitting` são agora geridos por `usePublishOrchestrator` (Fase 2).
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [savedCaptionsOpen, setSavedCaptionsOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<string>('');
  const [mediaValidations, setMediaValidations] = useState<MediaValidationResult[]>([]);
  // Separate captions per network
  const [useSeparateCaptions, setUseSeparateCaptions] = useState(false);
  const [networkCaptions, setNetworkCaptions] = useState<Record<string, string>>({});
  const [networkOptions, setNetworkOptions] = useState(createDefaultNetworkOptions);
  const [rawTranscription, setRawTranscription] = useState('');
  const [aiMetadata, setAiMetadata] = useState<Partial<EditorialAssistantResult> | null>(null);
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiAssistantDismissed, setAiAssistantDismissed] = useState(false);
  const mediaSectionRef = useRef<HTMLDivElement>(null);
  const captionEditorRef = useRef<NetworkCaptionEditorHandle>(null);
  const networkOptionsRef = useRef<NetworkOptionsCardHandle>(null);
  const aiMediaSignatureRef = useRef('');

  // ── Phase 1 hook: media state + DnD ────────────────────────────────────
  const mediaManager = useMediaManager();
  const {
    mediaFiles,
    mediaPreviewUrls,
    mediaSources,
    mediaAspectRatios,
    activeId,
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaAspectRatios,
    sensors,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    moveMedia,
    removeMedia,
  } = mediaManager;

  // Image compression flow (oversized images for Instagram).
  // Encapsulated in a single hook — see `useImageCompression`.
  const compression = useImageCompression({ maxSizeMB: 4 });

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
  const [pendingPublishParams, setPendingPublishParams] = useState<Parameters<typeof executePublish>[0] | null>(null);

  // Auto-save hook
  const { lastSaved, isSaving: isAutoSaving, hasUnsavedChanges } = useAutoSave({
    caption,
    networkCaptions,
    useSeparateCaptions,
    networkOptions,
    selectedFormats,
    mediaUrls: mediaPreviewUrls,
    scheduledDate: scheduledDate?.toISOString(),
    time,
    scheduleAsap,
    rawTranscription,
    aiMetadata,
  }, { enabled: selectedFormats.length > 0 || caption.length > 0 });

  // Note: showValidation state was removed — smartValidation.canPublish + validationSheetOpen
  // are now the single source of truth for the publish gate.

  // ── Phase 1 hook: stepper (must come before useDraftRecovery so its setters
  //    can be passed in) ───────────────────────────────────────────────────
  // mediaRequirements is computed below; for canAdvance flags we re-derive
  // the minimal info inline to avoid a forward reference.
  const _minMediaForStepper = useMemo(
    () => getMediaRequirements(selectedFormats).minMedia || 1,
    [selectedFormats],
  );
  const stepper = useStepper({
    canAdvanceToStep2: selectedFormats.length > 0,
    canAdvanceToStep3: mediaFiles.length >= _minMediaForStepper,
  });
  const {
    currentStep,
    visitedSteps,
    setCurrentStep,
    setVisitedSteps,
    goToStep,
    nextStep,
    previousStep,
  } = stepper;

  // ── Phase 1 hook: draft + recovery ─────────────────────────────────────
  const recovery = useDraftRecovery({
    recoverPostId,
    setCaption,
    setUseSeparateCaptions,
    setNetworkCaptions,
    setNetworkOptions,
    setRawTranscription,
    setAiMetadata,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaFiles,
    setMediaAspectRatios,
    setSelectedFormats,
    setScheduleAsap,
    setScheduledDate,
    setTime,
    setVisitedSteps,
    setCurrentStep,
  });
  const {
    isRecovering,
    recoveredPostId,
    setRecoveredPostId,
    currentDraftId,
    setCurrentDraftId,
    handleLoadDraft,
  } = recovery;

  // Compute media requirements based on selected formats
  const mediaRequirements = useMemo(() => getMediaRequirements(selectedFormats), [selectedFormats]);

  // ── Phase 1 hook: media upload + video validation ──────────────────────
  // Owns isUploading/uploadProgress, video validation modal state, and the
  // handleMediaUpload / handleVideoValidationContinue / handleVideoValidationCancel
  // handlers. Mutates carousel state via the setters from useMediaManager.
  const upload = useMediaUpload({
    selectedFormats,
    mediaFiles,
    mediaPreviewUrls,
    mediaRequirements,
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaAspectRatios,
    setMediaValidations,
  });
  const {
    uploadProgress,
    isUploading,
    setUploadProgress,
    setIsUploading,
    videoValidationModalOpen,
    videoValidationIssues,
    pendingVideoFiles,
    setVideoValidationModalOpen,
    handleMediaUpload,
    handleVideoValidationContinue,
    handleVideoValidationCancel,
  } = upload;

  // Mobile bottom-sheet state for the validation panel
  const [validationSheetOpen, setValidationSheetOpen] = useState(false);

  // Smart pre-validation (real-time)
  const smartValidation = useSmartValidation({
    selectedFormats,
    caption,
    networkCaptions,
    useSeparateCaptions,
    networkOptions,
    mediaFiles,
    hashtags: [],
    scheduledDate: scheduledDate ?? null,
    scheduleAsap,
    enabled: selectedFormats.length > 0,
    fixHelpers: {
      setCaption,
      setNetworkCaption: (network, next) => {
        setNetworkCaptions(prev => ({ ...prev, [network]: next }));
      },
      setMediaFiles,
      focusCaption: (network) => captionEditorRef.current?.focusCaption(network),
      focusNetworkOption: (network, field) => networkOptionsRef.current?.focusField(network, field),
    },
  });

  const maxLength = mediaRequirements.maxCaptionLength;
  const captionLength = caption.length;

  // Get unique networks from selected formats
  const selectedNetworks = useMemo(() => {
    const networks = new Set(selectedFormats.map(f => getNetworkFromFormat(f)));
    return Array.from(networks);
  }, [selectedFormats]);

  const ensureNetworkCaptions = useCallback(() => {
    setNetworkCaptions((prev) => {
      const next = { ...prev };
      selectedNetworks.forEach((network) => {
        if (!Object.prototype.hasOwnProperty.call(next, network)) {
          next[network] = caption;
        }
      });
      return next;
    });
  }, [caption, selectedNetworks]);

  useEffect(() => {
    const nextSignature = getMediaSignature(mediaFiles);
    const previousSignature = aiMediaSignatureRef.current;

    if (previousSignature && previousSignature !== nextSignature) {
      setRawTranscription('');
      setAiMetadata(null);
      setAiAssistantDismissed(false);
    }

    aiMediaSignatureRef.current = nextSignature;
  }, [mediaFiles]);

  // Update active preview tab when formats change
  useEffect(() => {
    if (selectedFormats.length > 0 && !activePreviewTab) {
      setActivePreviewTab(selectedFormats[0]);
    } else if (selectedFormats.length === 0) {
      setActivePreviewTab('');
    } else if (!selectedFormats.includes(activePreviewTab as PostFormat)) {
      setActivePreviewTab(selectedFormats[0]);
    }
  }, [selectedFormats, activePreviewTab]);

  // Progressive disclosure logic
  const showStep2 = selectedFormats.length > 0;
  const showStep3 = mediaFiles.length >= (mediaRequirements.minMedia || 1);
  // Step auto-advance + navigation now provided by useStepper hook above.
  // (currentStep, visitedSteps, setCurrentStep, setVisitedSteps, goToStep,
  //  nextStep, previousStep are all destructured from `stepper`.)

  // Note: legacy `getValidationErrors()`/`hasErrors` removed.
  // The smart-validation panel (`smartValidation.canPublish`) is now the
  // single source of truth for blocking publication. Coverage:
  //   - format/min/max/requiresVideo/Image  → formatValidator
  //   - LinkedIn requires caption           → captionValidator (M2)
  //   - Date in the past / missing date     → scheduleValidator (M1)
  //   - Network without account mapping     → accountValidator (A1)

  // ── Phase 2 hook: orquestrador de publicação ──────────────────────────
  // Encapsula saveDraft, submitForApproval, publishNow + wrappers com gating
  // de smart-validation. Mantém estado próprio (saving/submitting).
  const orchestrator = usePublishOrchestrator({
    selectedFormats,
    selectedNetworks,
    caption,
    networkCaptions,
    useSeparateCaptions,
    networkOptions,
    mediaFiles,
    scheduledDate,
    time,
    scheduleAsap,
    recoveredPostId,
    currentDraftId,
    rawTranscription,
    aiMetadata,
    smartValidation,
    compression,
    executePublish,
    quota: { instagram, linkedin, isUnlimited, refresh: refreshQuota },
    setCurrentDraftId,
    setCaption,
    setMediaFiles,
    setMediaPreviewUrls,
    setScheduledDate,
    setTime,
    setScheduleAsap,
    setUploadProgress,
    setValidationSheetOpen,
    onDuplicateDetected: (warning, params) => {
      setDuplicateWarning(warning);
      setPendingPublishParams(params);
    },
    onNavigateAfterSubmit: () => navigate('/calendar'),
  });
  const { saving, submitting } = orchestrator;
  const handleSaveDraft = orchestrator.saveDraft;
  const handlePublishWithValidation = orchestrator.publishWithValidation;
  const handleSubmitWithValidation = orchestrator.submitWithValidation;


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


  const handleSubmitForApproval = orchestrator.submitForApproval;

  const handlePublishNow = orchestrator.publishNow;

  // Compression flow handlers — delegated to `useImageCompression`.
  // The hook owns state; this component owns side-effects (mediaFiles update,
  // chained publish call) that depend on local closures.
  const handleConfirmCompression = () => compression.runCompression(mediaFiles);

  const handleConfirmAndPublish = async () => {
    const compressed = compression.acceptCompressedFiles();
    setMediaFiles(compressed);
    await handlePublishNow(compressed);
  };

  const handleCancelCompression = () => compression.cancel();

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

  const showAiUploadAssistant = useMemo(() => {
    if (aiAssistantDismissed || aiAssistantLoading || rawTranscription) return false;
    if (mediaFiles.length !== 1 || !mediaFiles[0]?.type?.startsWith('video/')) return false;
    if (selectedFormats.some((format) => format.includes('document'))) return false;
    const hasVideoFormat = selectedFormats.some((format) =>
      format.includes('video') || format.includes('reel') || format.includes('shorts') || format.includes('stories') || format === 'linkedin_post',
    );
    return hasVideoFormat || mediaAspectRatios[0] === '9:16';
  }, [aiAssistantDismissed, aiAssistantLoading, rawTranscription, mediaFiles, selectedFormats, mediaAspectRatios]);

  const fileToBase64 = useCallback((file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler ficheiro'));
    reader.readAsDataURL(file);
  }), []);

  const handleAiTranscribe = useCallback(async () => {
    const file = mediaFiles[0];
    if (!file) return;
    try {
      setAiAssistantLoading(true);
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('ai-editorial-assistant', {
        body: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          networks: selectedNetworks,
          language: 'pt-PT',
        },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || 'A IA está indisponível.');

      const result = data.result as EditorialAssistantResult;
      const groupedHashtags = [
        ...(result.hashtags?.reach ?? []),
        ...(result.hashtags?.niche ?? []),
        ...(result.hashtags?.brand ?? []),
      ].map((tag) => tag.startsWith('#') ? tag : `#${tag}`);
      const nextCaption = [result.base_caption, groupedHashtags.join(' ')].filter(Boolean).join('\n\n');

      setCaption(nextCaption);
      if (result.captions_per_network && Object.keys(result.captions_per_network).length > 0) {
        setNetworkCaptions(result.captions_per_network as Record<string, string>);
        setUseSeparateCaptions(true);
      }
      if (result.first_comment) {
        setNetworkOptions((prev) => normalizeNetworkOptions({
          ...prev,
          instagram: { ...prev.instagram, firstComment: result.first_comment },
          facebook: { ...prev.facebook, firstComment: result.first_comment },
          linkedin: { ...prev.linkedin, firstComment: result.first_comment },
        }));
      }
      setRawTranscription(result.raw_transcription || '');
      setAiMetadata(result);
      setAiAssistantDismissed(true);
      toast.success('Assistente de IA aplicado', { description: 'A legenda e os campos editoriais foram preenchidos.' });
    } catch (error) {
      console.error('[ManualCreate] AI assistant error:', error);
      toast.error('A IA está indisponível. Podes preencher manualmente ou tentar de novo.');
    } finally {
      setAiAssistantLoading(false);
    }
  }, [fileToBase64, mediaFiles, selectedNetworks]);

  // Render preview delegated to extracted helper (Phase 4)
  const renderPreview = useCallback(
    (format: PostFormat) => renderFormatPreview(format, { caption, networkCaptions, useSeparateCaptions, mediaFiles, mediaPreviewUrls, mediaItems }),
    [caption, networkCaptions, useSeparateCaptions, mediaFiles, mediaPreviewUrls, mediaItems],
  );

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

      <RecoveryBanner
        isRecovering={isRecovering}
        recoveredPostId={recoveredPostId}
        mediaFiles={mediaFiles}
        mediaPreviewUrls={mediaPreviewUrls}
        setRecoveredPostId={setRecoveredPostId}
        setMediaPreviewUrls={setMediaPreviewUrls}
        setMediaFiles={setMediaFiles}
        setMediaSources={setMediaSources}
        setMediaAspectRatios={setMediaAspectRatios}
        setCaption={setCaption}
        setSelectedFormats={setSelectedFormats}
        setNetworkCaptions={setNetworkCaptions}
        setUseSeparateCaptions={setUseSeparateCaptions}
      />

      <QuotaWarningBanner
        selectedNetworks={selectedNetworks}
        isUnlimited={isUnlimited}
        instagram={instagram}
        linkedin={linkedin}
      />

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
          <Step2MediaCard
            visible={showStep2}
            mediaFiles={mediaFiles}
            mediaPreviewUrls={mediaPreviewUrls}
            mediaSources={mediaSources}
            mediaAspectRatios={mediaAspectRatios}
            mediaRequirements={mediaRequirements}
            selectedFormats={selectedFormats}
            setMediaFiles={setMediaFiles}
            setMediaPreviewUrls={setMediaPreviewUrls}
            setMediaSources={setMediaSources}
            removeMedia={removeMedia}
            moveMedia={moveMedia}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            handleMediaUpload={handleMediaUpload}
            getAcceptTypes={getAcceptTypes}
            sensors={sensors}
            activeId={activeId}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDragCancel={handleDragCancel}
            lastSaved={lastSaved}
            isAutoSaving={isAutoSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            saving={saving}
            submitting={submitting}
            publishing={publishing}
            mediaSectionRef={mediaSectionRef}
            onPreviousStep={previousStep}
            onNextStep={nextStep}
          />

          {/* Step 3: Caption & Scheduling - Progressive Disclosure */}
          <div className={cn(
            "transition-all duration-300 ease-out overflow-hidden space-y-3 sm:space-y-6",
            showStep3 ? "opacity-100" : "opacity-0 max-h-0"
          )}>
            <AiUploadAssistantCard
              visible={showAiUploadAssistant || aiAssistantLoading}
              loading={aiAssistantLoading}
              onDismiss={() => setAiAssistantDismissed(true)}
              onTranscribe={handleAiTranscribe}
            />

            <Step3CaptionCard
              ref={captionEditorRef}
              caption={caption}
              onCaptionChange={setCaption}
              networkCaptions={networkCaptions}
              onNetworkCaptionChange={(network, value) => {
                setNetworkCaptions(prev => ({ ...prev, [network]: value }));
              }}
              selectedNetworks={selectedNetworks}
              useSeparateCaptions={useSeparateCaptions}
              onToggleSeparate={setUseSeparateCaptions}
              captionLength={captionLength}
              maxLength={maxLength}
              disabled={saving || submitting || publishing}
              onOpenSavedCaptions={() => setSavedCaptionsOpen(true)}
              onOpenAIDialog={() => setAiDialogOpen(true)}
            />

            <NetworkOptionsCard
              ref={networkOptionsRef}
              selectedNetworks={selectedNetworks}
              networkOptions={networkOptions}
              onNetworkOptionsChange={(next) => setNetworkOptions(normalizeNetworkOptions(next))}
              caption={caption}
              onCaptionChange={setCaption}
              networkCaptions={networkCaptions}
              onNetworkCaptionChange={(network, value) => {
                setNetworkCaptions(prev => ({ ...prev, [network]: value }));
              }}
              useSeparateCaptions={useSeparateCaptions}
              mediaPreviewUrls={mediaPreviewUrls}
              disabled={saving || submitting || publishing}
            />

            <Step3ScheduleCard
              scheduleAsap={scheduleAsap}
              onScheduleAsapChange={setScheduleAsap}
              scheduledDate={scheduledDate}
              onScheduledDateChange={setScheduledDate}
              time={time}
              onTimeChange={setTime}
              onPreviousStep={previousStep}
            />

            {/* Actions - Reorganized Hierarchy - Hidden on mobile (use bottom bar) */}
            <PublishActionsCard
              saving={saving}
              submitting={submitting}
              publishing={publishing}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              selectedFormats={selectedFormats}
              smartValidation={smartValidation}
              mediaFiles={mediaFiles}
              scheduleAsap={scheduleAsap}
              scheduledDate={scheduledDate}
              onPublish={handlePublishWithValidation}
              onSaveDraft={handleSaveDraft}
              onOpenDrafts={() => setDraftsDialogOpen(true)}
              onViewCalendar={() => navigate('/calendar')}
              onSubmitForApproval={handleSubmitWithValidation}
            />
          </div>
        </div>

        {/* Right - Preview - HIDDEN on mobile */}
        <PreviewPanel
          variant="desktop"
          selectedFormats={selectedFormats}
          activePreviewTab={activePreviewTab}
          onActivePreviewTabChange={setActivePreviewTab}
          scheduledDate={scheduledDate}
          scheduleAsap={scheduleAsap}
          time={time}
          renderPreview={renderPreview}
          getNetworkIcon={getNetworkIcon}
        />
      </div>

      {/* Mobile Sticky Bottom Bar (extracted) */}
      <MobileStickyActionBar
        currentStep={currentStep}
        scheduleAsap={scheduleAsap}
        scheduledDate={scheduledDate}
        time={time}
        selectedFormats={selectedFormats}
        smartValidation={smartValidation}
        onOpenValidationSheet={() => setValidationSheetOpen(true)}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishWithValidation}
        onOpenPreview={() => setMobilePreviewOpen(true)}
        saving={saving}
        submitting={submitting}
        publishing={publishing}
        isUploading={isUploading}
      />

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
            <PreviewPanel
              variant="mobile"
              selectedFormats={selectedFormats}
              activePreviewTab={activePreviewTab}
              onActivePreviewTabChange={setActivePreviewTab}
              scheduledDate={scheduledDate}
              scheduleAsap={scheduleAsap}
              time={time}
              renderPreview={renderPreview}
              getNetworkIcon={getNetworkIcon}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <DevHelper />

      <ManualCreateModals
        draftsDialogOpen={draftsDialogOpen}
        setDraftsDialogOpen={setDraftsDialogOpen}
        onLoadDraft={handleLoadDraft}
        savedCaptionsOpen={savedCaptionsOpen}
        setSavedCaptionsOpen={setSavedCaptionsOpen}
        caption={caption}
        setCaption={setCaption}
        aiDialogOpen={aiDialogOpen}
        setAiDialogOpen={setAiDialogOpen}
        compressionModalProps={compression.modalProps}
        onCancelCompression={handleCancelCompression}
        onConfirmCompression={handleConfirmCompression}
        onConfirmAndPublish={handleConfirmAndPublish}
        mediaFilesCount={mediaFiles.length}
        videoValidationModalOpen={videoValidationModalOpen}
        setVideoValidationModalOpen={setVideoValidationModalOpen}
        videoValidationIssues={videoValidationIssues}
        onVideoValidationContinue={handleVideoValidationContinue}
        onVideoValidationCancel={handleVideoValidationCancel}
        publishing={publishing}
        publishProgress={publishProgress}
        onResetProgress={resetProgress}
        setIsCancellingPublish={setIsCancellingPublish}
        onCreateNew={handleCreateNew}
        onViewCalendar={handleViewCalendar}
        mediaFiles={mediaFiles}
        onCancelPublishing={handleCancelPublishing}
        isCancellingPublish={isCancellingPublish}
        duplicateWarning={duplicateWarning}
        onClearDuplicate={() => {
          setDuplicateWarning(null);
          setPendingPublishParams(null);
        }}
        pendingPublishCaption={pendingPublishParams?.caption}
        onConfirmDuplicate={async () => {
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
    </div>
  );
}
