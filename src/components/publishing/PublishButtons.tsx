import { Instagram, Linkedin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PublishButtonsProps {
  showInstagram?: boolean;
  showLinkedIn?: boolean;
  onPublishInstagram?: () => void;
  onPublishLinkedIn?: () => void;
  isPublishing?: boolean;
  instagramDisabled?: boolean;
  linkedinDisabled?: boolean;
  quotaText?: string;
  canPublish?: boolean;
  className?: string;
}

export function PublishButtons({
  showInstagram = false,
  showLinkedIn = false,
  onPublishInstagram,
  onPublishLinkedIn,
  isPublishing = false,
  instagramDisabled = false,
  linkedinDisabled = false,
  quotaText = '0/5',
  canPublish = true,
  className,
}: PublishButtonsProps) {
  const showBoth = showInstagram && showLinkedIn;

  if (!showInstagram && !showLinkedIn) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        "rounded-xl border-2 border-border bg-gradient-to-br from-card to-accent/5 p-4 shadow-sm",
        className
      )}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Instagram Button */}
          {showInstagram && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    onClick={onPublishInstagram}
                    disabled={isPublishing || instagramDisabled || !canPublish}
                    className={cn(
                      "w-full h-12 relative overflow-hidden transition-all duration-150",
                      "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
                      "disabled:from-gray-400 disabled:to-gray-500",
                      "shadow-md hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <Instagram className="w-5 h-5" />
                      <span className="font-semibold">
                        {isPublishing ? 'A publicar...' : 'Publicar Instagram'}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "ml-2 font-mono text-xs",
                          !canPublish && "bg-red-500/20 text-red-100"
                        )}
                      >
                        {quotaText}
                      </Badge>
                    </div>
                  </Button>
                </div>
              </TooltipTrigger>
              {!canPublish && (
                <TooltipContent 
                  side="bottom" 
                  className="max-w-[280px] bg-red-500/10 border-red-500/30"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-red-600">Quota Excedida</p>
                      <p className="text-xs text-muted-foreground">
                        Atingiu o limite de 5 publicações mensais.
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* LinkedIn Button */}
          {showLinkedIn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    onClick={onPublishLinkedIn}
                    disabled={isPublishing || linkedinDisabled || !canPublish}
                    className={cn(
                      "w-full h-12 relative overflow-hidden transition-all duration-150",
                      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                      "disabled:from-gray-400 disabled:to-gray-500",
                      "shadow-md hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <Linkedin className="w-5 h-5" />
                      <span className="font-semibold">
                        {isPublishing ? 'A publicar...' : 'Publicar LinkedIn'}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "ml-2 font-mono text-xs",
                          !canPublish && "bg-red-500/20 text-red-100"
                        )}
                      >
                        {quotaText}
                      </Badge>
                    </div>
                  </Button>
                </div>
              </TooltipTrigger>
              {!canPublish && (
                <TooltipContent 
                  side="bottom" 
                  className="max-w-[280px] bg-red-500/10 border-red-500/30"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-red-600">Quota Excedida</p>
                      <p className="text-xs text-muted-foreground">
                        Atingiu o limite de 5 publicações mensais.
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>

        {/* Info Text */}
        {showBoth && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Pode publicar em ambas as plataformas simultaneamente
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
