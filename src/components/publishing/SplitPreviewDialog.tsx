import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IgPostMock } from "./IgPostMock";
import { LiPostMock } from "./LiPostMock";
import { Instagram, Linkedin } from "lucide-react";

interface SplitPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlatforms: string[];
  mediaCount?: number;
  hasWarnings?: boolean;
  warningCount?: number;
}

const SplitPreviewDialog = ({
  open,
  onOpenChange,
  selectedPlatforms,
  mediaCount = 1,
  hasWarnings,
  warningCount,
}: SplitPreviewDialogProps) => {
  const showBoth = selectedPlatforms.includes("instagram") && selectedPlatforms.includes("linkedin");
  const showInstagram = selectedPlatforms.includes("instagram");
  const showLinkedin = selectedPlatforms.includes("linkedin");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-full p-0">
        <DialogHeader className="px-6 py-4 border-b backdrop-blur-md bg-background/95">
          <DialogTitle className="flex items-center gap-3">
            <span>Pré-visualização</span>
            <div className="flex items-center gap-2">
              {showInstagram && (
                <div className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </div>
              )}
              {showBoth && <span className="text-muted-foreground">•</span>}
              {showLinkedin && (
                <div className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showBoth ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-10">
                <IgPostMock 
                  mediaCount={mediaCount} 
                  hasWarnings={hasWarnings}
                  warningCount={warningCount}
                />
                <LiPostMock 
                  mediaCount={mediaCount}
                  hasWarnings={hasWarnings}
                  warningCount={warningCount}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                {showInstagram && (
                  <IgPostMock 
                    mediaCount={mediaCount}
                    hasWarnings={hasWarnings}
                    warningCount={warningCount}
                  />
                )}
                {showLinkedin && (
                  <LiPostMock 
                    mediaCount={mediaCount}
                    hasWarnings={hasWarnings}
                    warningCount={warningCount}
                  />
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SplitPreviewDialog;
