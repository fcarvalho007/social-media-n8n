import DraftsDialog from '@/components/manual-post/DraftsDialog';
import SavedCaptionsDialog from '@/components/manual-post/SavedCaptionsDialog';
import AICaptionDialog from '@/components/manual-post/AICaptionDialog';
import { ImageCompressionConfirmModal } from '@/components/publishing/ImageCompressionConfirmModal';
import { VideoValidationModal, VideoValidationIssue } from '@/components/publishing/VideoValidationModal';
import { PublishProgressModal } from '@/components/publishing/PublishProgressModal';
import { DuplicateWarningDialog } from '@/components/publishing/DuplicateWarningDialog';

interface DuplicateWarning {
  id: string;
  created_at: string;
  selected_networks: string[] | null;
  status: string | null;
}

interface ManualCreateModalsProps {
  // Drafts / captions / AI
  draftsDialogOpen: boolean;
  setDraftsDialogOpen: (open: boolean) => void;
  onLoadDraft: (draft: unknown) => void | Promise<void>;

  savedCaptionsOpen: boolean;
  setSavedCaptionsOpen: (open: boolean) => void;
  caption: string;
  setCaption: (c: string) => void;

  aiDialogOpen: boolean;
  setAiDialogOpen: (open: boolean) => void;

  // Compression
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compressionModalProps: any;
  onCancelCompression: () => void;
  onConfirmCompression: () => void;
  onConfirmAndPublish: () => Promise<void> | void;
  mediaFilesCount: number;

  // Video validation
  videoValidationModalOpen: boolean;
  setVideoValidationModalOpen: (open: boolean) => void;
  videoValidationIssues: VideoValidationIssue[];
  onVideoValidationContinue: () => void;
  onVideoValidationCancel: () => void;

  // Publish progress
  publishing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publishProgress: any;
  onResetProgress: () => void;
  setIsCancellingPublish: (v: boolean) => void;
  onCreateNew: () => void;
  onViewCalendar: () => void;
  mediaFiles: File[];
  onCancelPublishing: () => Promise<void>;
  isCancellingPublish: boolean;

  // Duplicate
  duplicateWarning: DuplicateWarning | null;
  onClearDuplicate: () => void;
  pendingPublishCaption?: string;
  onConfirmDuplicate: () => Promise<void> | void;
}

/**
 * Aggregated modal layer for ManualCreate.
 * Phase 4 extraction — purely presentational; all state/handlers live in the parent.
 */
export function ManualCreateModals(props: ManualCreateModalsProps) {
  const {
    draftsDialogOpen,
    setDraftsDialogOpen,
    onLoadDraft,
    savedCaptionsOpen,
    setSavedCaptionsOpen,
    caption,
    setCaption,
    aiDialogOpen,
    setAiDialogOpen,
    compressionModalProps,
    onCancelCompression,
    onConfirmCompression,
    onConfirmAndPublish,
    mediaFilesCount,
    videoValidationModalOpen,
    setVideoValidationModalOpen,
    videoValidationIssues,
    onVideoValidationContinue,
    onVideoValidationCancel,
    publishing,
    publishProgress,
    onResetProgress,
    setIsCancellingPublish,
    onCreateNew,
    onViewCalendar,
    mediaFiles,
    onCancelPublishing,
    isCancellingPublish,
    duplicateWarning,
    onClearDuplicate,
    pendingPublishCaption,
    onConfirmDuplicate,
  } = props;

  return (
    <>
      <DraftsDialog open={draftsDialogOpen} onOpenChange={setDraftsDialogOpen} onLoadDraft={onLoadDraft} />

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

      <ImageCompressionConfirmModal
        {...compressionModalProps}
        onClose={onCancelCompression}
        onConfirm={onConfirmCompression}
        onConfirmPublish={onConfirmAndPublish}
        totalMediaCount={mediaFilesCount}
      />

      <VideoValidationModal
        open={videoValidationModalOpen}
        onOpenChange={setVideoValidationModalOpen}
        issues={videoValidationIssues}
        onContinue={onVideoValidationContinue}
        onCancel={onVideoValidationCancel}
      />

      <PublishProgressModal
        isOpen={publishing || (publishProgress.phase2.status !== 'idle' && publishProgress.phase2.status !== 'waiting')}
        onClose={() => {
          if (!publishing) {
            onResetProgress();
            setIsCancellingPublish(false);
          }
        }}
        progress={publishProgress}
        onCreateNew={onCreateNew}
        onViewCalendar={onViewCalendar}
        mediaFiles={mediaFiles}
        caption={caption}
        onCancel={onCancelPublishing}
        isCancelling={isCancellingPublish}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={!!duplicateWarning}
          onOpenChange={(open) => {
            if (!open) onClearDuplicate();
          }}
          duplicate={duplicateWarning}
          caption={pendingPublishCaption}
          onConfirm={onConfirmDuplicate}
        />
      )}
    </>
  );
}
