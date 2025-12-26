import { useState, useEffect } from 'react';
import { AlertTriangle, Info, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PostFormat } from '@/types/social';
import { FORMAT_TO_NETWORK } from '@/types/publishing';
import { analyzeFilesForInstagram, AspectRatioAnalysis } from '@/lib/canvas/instagramResize';

interface AspectRatioWarningProps {
  mediaFiles: File[];
  selectedFormats: PostFormat[];
}

export function AspectRatioWarning({ mediaFiles, selectedFormats }: AspectRatioWarningProps) {
  const [imagesNeedingResize, setImagesNeedingResize] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Map<string, AspectRatioAnalysis>>(new Map());
  
  // Check if any Instagram format is selected
  const hasInstagram = selectedFormats.some(
    format => (FORMAT_TO_NETWORK[format] || 'instagram') === 'instagram'
  );
  
  // Analyze files when they change
  useEffect(() => {
    if (!hasInstagram || mediaFiles.length === 0) {
      setImagesNeedingResize(0);
      setAnalysisResults(new Map());
      return;
    }
    
    const analyzeFiles = async () => {
      setIsAnalyzing(true);
      try {
        const { needsResize, analysis } = await analyzeFilesForInstagram(mediaFiles);
        setImagesNeedingResize(needsResize.length);
        setAnalysisResults(analysis);
      } catch (error) {
        console.error('[AspectRatioWarning] Error analyzing files:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    analyzeFiles();
  }, [mediaFiles, hasInstagram]);
  
  // Don't show anything if no Instagram selected or no issues
  if (!hasInstagram || imagesNeedingResize === 0) {
    return null;
  }
  
  // Get details for tooltip
  const getTooltipContent = () => {
    const issues: string[] = [];
    analysisResults.forEach((analysis, fileName) => {
      if (analysis.needsResize) {
        const shortName = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
        issues.push(`• ${shortName}: ${analysis.message}`);
      }
    });
    return issues.join('\n');
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 cursor-help flex items-center gap-1.5 py-1"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              {imagesNeedingResize === 1 
                ? '1 imagem será ajustada' 
                : `${imagesNeedingResize} imagens serão ajustadas`}
            </span>
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1.5">
              <p className="font-medium">Auto-ajuste de Proporção</p>
              <p className="text-muted-foreground">
                {imagesNeedingResize === 1 
                  ? 'Esta imagem está fora do aspect ratio do Instagram (4:5 a 1.91:1).'
                  : `${imagesNeedingResize} imagens estão fora do aspect ratio do Instagram (4:5 a 1.91:1).`}
              </p>
              <p className="text-muted-foreground">
                Serão adicionadas margens brancas automaticamente para ajustar, 
                sem cortar ou deformar a imagem original.
              </p>
              {analysisResults.size > 0 && (
                <div className="pt-1 border-t border-border mt-1">
                  <p className="text-muted-foreground font-mono text-[10px] whitespace-pre-line">
                    {getTooltipContent()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
