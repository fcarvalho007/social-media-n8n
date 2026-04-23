import { SocialNetwork, PostFormat } from '@/types/social';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCategory =
  | 'format'
  | 'media'
  | 'caption'
  | 'platform'
  | 'schedule'
  | 'duplicate';

export interface ValidationIssue {
  /** Stable id used as React key and for dismiss tracking. */
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  /** Network this issue is about (drives the colour chip). */
  platform?: SocialNetwork;
  /** Optional originating format (more specific than platform). */
  format?: PostFormat;
  /** Short title shown in the card header (≤60 chars). */
  title: string;
  /** Actionable description displayed under the title. */
  description: string;
  /** Indices of media items affected (used to render thumbnails). */
  affectedItems?: number[];
  /** Whether the issue can be auto-fixed by the UI. */
  autoFixable?: boolean;
  /** Label of the auto-fix button (e.g. "Ajustar para 4:5"). */
  fixLabel?: string;
  /** Async action that performs the auto-fix. */
  fixAction?: () => Promise<void> | void;
  /** Issues that are dismissable (currently info severity). */
  dismissable?: boolean;
}

export interface ValidatorContext {
  selectedFormats: PostFormat[];
  caption: string;
  /** Captions keyed by network when per-network copy is enabled. */
  networkCaptions?: Record<string, string>;
  /** Whether validators should prefer `networkCaptions[network]`. */
  useSeparateCaptions?: boolean;
  mediaFiles: File[];
  hashtags: string[];
  scheduledDate: Date | null;
  scheduleAsap: boolean;
  userId?: string | null;
  /** AbortSignal so long-running validators can bail early. */
  signal?: AbortSignal;
  /** Auto-fix action helpers wired by the host hook. */
  fixHelpers?: ValidationFixHelpers;
}

export interface ValidationFixHelpers {
  /** Replace the current caption value. */
  setCaption?: (next: string) => void;
  /** Replace the caption for one social network. */
  setNetworkCaption?: (network: SocialNetwork, next: string) => void;
  /** Replace hashtags array. */
  setHashtags?: (next: string[]) => void;
  /** Replace the working set of media files. */
  setMediaFiles?: (next: File[]) => void;
  /** Focus the caption editor so the user can manually edit. */
  focusCaption?: () => void;
}

export interface ValidationSummary {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  canPublish: boolean;
  isValidating: boolean;
  byPlatform: Partial<Record<SocialNetwork, ValidationIssue[]>>;
  byCategory: Partial<Record<ValidationCategory, ValidationIssue[]>>;
  fix: (id: string) => Promise<void>;
  dismiss: (id: string) => void;
  /** True when the empty-state ✅ block should be shown. */
  isClean: boolean;
}
