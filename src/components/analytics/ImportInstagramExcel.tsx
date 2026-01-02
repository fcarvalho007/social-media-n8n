import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportInstagramExcelProps {
  onImport: (posts: any[]) => void;
  isImporting: boolean;
}

export function ImportInstagramExcel({ onImport, isImporting }: ImportInstagramExcelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Ficheiro vazio ou formato inválido");
        return;
      }

      // Map Excel columns to our expected format
      const mappedData = jsonData.map((row: any) => ({
        url: row.url || row.URL || row.postUrl || row.inputUrl,
        shortCode: row.shortCode || row.shortcode || extractShortcode(row.url || row.inputUrl),
        type: row.type || row.Type || "Image",
        caption: row.caption || row.Caption || row.text || "",
        hashtags: parseHashtags(row.hashtags || row.caption),
        likesCount: parseInt(row.likesCount || row.likes || row.Likes || 0),
        commentsCount: parseInt(row.commentsCount || row.comments || row.Comments || 0),
        videoViewCount: parseInt(row.videoViewCount || row.views || row.Views || row.videoPlayCount || 0),
        displayUrl: row.displayUrl || row.imageUrl || row.thumbnailUrl,
        images: parseImages(row.images),
        timestamp: row.timestamp || row.date || row.postedAt,
        locationName: row.locationName || row.location,
        ownerUsername: row.ownerUsername || row.username,
        ownerFullName: row.ownerFullName || row.fullName || "",
        followersCount: parseInt(row.followersCount || row.followers || 0),
        isSponsored: row.isSponsored === true || row.isSponsored === "true",
        dimensionsWidth: parseInt(row.dimensionsWidth || row.width || 0),
        dimensionsHeight: parseInt(row.dimensionsHeight || row.height || 0),
        isVideo: row.isVideo === true || row.type === "Video" || row.type === "Sidecar",
        videoDuration: parseFloat(row.videoDuration || 0),
        childPosts: parseChildPosts(row.childPosts),
      }));

      setPreview(mappedData.slice(0, 5));
      console.log(`Parsed ${mappedData.length} rows from Excel`, mappedData[0]);

      // Store full data for import
      (window as any).__excelImportData = mappedData;
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("Erro ao ler ficheiro Excel");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractShortcode = (url: string | undefined): string => {
    if (!url) return "";
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)/) || url.match(/\/reel\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
  };

  const parseHashtags = (text: string | undefined): string[] => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    const matches = String(text).match(/#\w+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  };

  const parseImages = (images: any): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === "string") {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        // Maybe comma-separated
        return images.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const parseChildPosts = (childPosts: any): any[] => {
    if (!childPosts) return [];
    if (Array.isArray(childPosts)) return childPosts;
    if (typeof childPosts === "string") {
      try {
        const parsed = JSON.parse(childPosts);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleImport = () => {
    const data = (window as any).__excelImportData;
    if (!data || data.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }
    onImport(data);
    setIsOpen(false);
    setPreview(null);
    delete (window as any).__excelImportData;
  };

  const getImageCount = (post: any): number => {
    let count = 0;
    if (post.displayUrl) count++;
    if (post.images?.length) count += post.images.length;
    if (post.childPosts?.length) count += post.childPosts.length;
    return Math.max(count, 1);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Importar Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Dados do Instagram</DialogTitle>
            <DialogDescription>
              Carregue um ficheiro Excel (.xlsx) com os dados das suas publicações do Instagram.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar um ficheiro Excel
                </span>
                <span className="text-xs text-muted-foreground">
                  .xlsx, .xls ou .csv
                </span>
              </label>
            </div>

            {/* Preview */}
            {preview && preview.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Preview ({(window as any).__excelImportData?.length || 0} publicações)
                </h4>
                <div className="border rounded-lg p-3 bg-muted/30 max-h-[280px] overflow-y-auto space-y-3">
                  {preview.map((post, i) => (
                    <div key={i} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      {/* Thumbnail preview */}
                      <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {post.displayUrl ? (
                          <img 
                            src={post.displayUrl} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Post info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {post.ownerUsername ? `@${post.ownerUsername}` : "Sem username"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {post.caption?.substring(0, 50) || "Sem legenda"}...
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>❤️ {post.likesCount?.toLocaleString()}</span>
                          <span>💬 {post.commentsCount?.toLocaleString()}</span>
                          <span>📸 {getImageCount(post)}</span>
                          <span className="capitalize">{post.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(window as any).__excelImportData?.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {(window as any).__excelImportData.length - 5} mais publicações...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!preview || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {(window as any).__excelImportData?.length || 0} Posts
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
