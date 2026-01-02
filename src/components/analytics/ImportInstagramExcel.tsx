import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, ImageIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface ImportInstagramExcelProps {
  onImport?: (posts: any[]) => void;
  isImporting?: boolean;
}

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  imagesStored: number;
  imagesFailed: number;
}

interface ColumnMapping {
  name: string;
  mapped: boolean;
  excelColumn: string | null;
}

const BATCH_SIZE = 25;

export function ImportInstagramExcel({ onImport, isImporting: externalIsImporting }: ImportInstagramExcelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const REQUIRED_MAPPINGS = [
    { name: "shortCode", label: "Shortcode", keys: ["shortCode", "shortcode"] },
    { name: "url", label: "URL", keys: ["url", "URL", "postUrl", "inputUrl"] },
    { name: "ownerUsername", label: "Username", keys: ["ownerUsername", "username"] },
    { name: "caption", label: "Legenda", keys: ["caption", "Caption", "text"] },
    { name: "likesCount", label: "Likes", keys: ["likesCount", "likes", "Likes"] },
    { name: "commentsCount", label: "Comentários", keys: ["commentsCount", "comments", "Comments"] },
    { name: "displayUrl", label: "Imagem", keys: ["displayUrl", "imageUrl", "thumbnailUrl"] },
    { name: "timestamp", label: "Data", keys: ["timestamp", "date", "postedAt"] },
  ];

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

      // Get column names from first row
      const columns = Object.keys(jsonData[0] as object);
      setExcelColumns(columns);

      // Check column mappings
      const mappings: ColumnMapping[] = REQUIRED_MAPPINGS.map((req) => {
        const foundColumn = columns.find((col) =>
          req.keys.some((k) => k.toLowerCase() === col.toLowerCase())
        );
        return {
          name: req.label,
          mapped: !!foundColumn,
          excelColumn: foundColumn || null,
        };
      });
      setColumnMappings(mappings);

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

      // Filter valid posts (must have shortcode or url)
      const validPosts = mappedData.filter(
        (p) => p.shortCode || p.url
      );

      setParsedData(validPosts);
      setPreview(validPosts.slice(0, 5));
      console.log(`Parsed ${validPosts.length} valid rows from Excel (${mappedData.length - validPosts.length} invalid)`, validPosts[0]);

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

  const handleBatchImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setIsImporting(true);
    setProgress({
      current: 0,
      total: parsedData.length,
      imported: 0,
      duplicates: 0,
      failed: 0,
      imagesStored: 0,
      imagesFailed: 0,
    });

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;
    let totalImagesStored = 0;
    let totalImagesFailed = 0;

    // Process in batches
    for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
      const batch = parsedData.slice(i, Math.min(i + BATCH_SIZE, parsedData.length));

      try {
        const { data, error } = await supabase.functions.invoke("import-instagram-data", {
          body: { posts: batch, alsoImportToMediaLibrary: true },
        });

        if (error) {
          console.error("Batch error:", error);
          totalFailed += batch.length;
        } else {
          totalImported += data.imported || 0;
          totalDuplicates += data.duplicates || 0;
          totalImagesStored += data.imagesStored || 0;
          totalImagesFailed += data.imagesFailed || 0;
        }
      } catch (err) {
        console.error("Batch exception:", err);
        totalFailed += batch.length;
      }

      // Update progress
      setProgress({
        current: Math.min(i + BATCH_SIZE, parsedData.length),
        total: parsedData.length,
        imported: totalImported,
        duplicates: totalDuplicates,
        failed: totalFailed,
        imagesStored: totalImagesStored,
        imagesFailed: totalImagesFailed,
      });
    }

    // Final toast
    if (totalImported > 0) {
      toast.success(
        `✅ ${totalImported} posts importados com sucesso!`,
        {
          description: totalDuplicates > 0
            ? `${totalDuplicates} duplicados ignorados • ${totalImagesStored} imagens guardadas`
            : `${totalImagesStored} imagens guardadas no storage`,
        }
      );
    } else if (totalDuplicates > 0) {
      toast.info(`Todos os ${totalDuplicates} posts já existiam na base de dados`);
    } else {
      toast.error("Nenhum post foi importado. Verifique os dados.");
    }

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["media-library"] });

    // Close after a small delay to show final progress
    setTimeout(() => {
      setIsOpen(false);
      setIsImporting(false);
      setProgress(null);
      setPreview(null);
      setParsedData(null);
      setColumnMappings([]);
      setExcelColumns([]);
    }, 1500);
  };

  const getImageCount = (post: any): number => {
    let count = 0;
    if (post.displayUrl) count++;
    if (post.images?.length) count += post.images.length;
    if (post.childPosts?.length) count += post.childPosts.length;
    return Math.max(count, 1);
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

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

      <Dialog open={isOpen} onOpenChange={(open) => !isImporting && setIsOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Dados do Instagram</DialogTitle>
            <DialogDescription>
              Carregue um ficheiro Excel (.xlsx) com os dados das suas publicações do Instagram.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Import Progress */}
            {isImporting && progress && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Importando...</span>
                  <span className="text-sm text-muted-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Processando: {progress.current}/{progress.total}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Importados: {progress.imported}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>Duplicados: {progress.duplicates}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3 w-3 text-blue-500" />
                    <span>Imagens: {progress.imagesStored}</span>
                  </div>
                </div>
              </div>
            )}

            {/* File input - hidden during import */}
            {!isImporting && (
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
            )}

            {/* Column Mapping Validation */}
            {!isImporting && columnMappings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  Mapeamento de Colunas
                  <span className="text-xs text-muted-foreground">
                    ({excelColumns.length} colunas detectadas)
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-1.5 p-3 border rounded-lg bg-muted/30">
                  {columnMappings.map((mapping) => (
                    <div
                      key={mapping.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {mapping.mapped ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className={mapping.mapped ? "" : "text-muted-foreground"}>
                        {mapping.name}
                      </span>
                      {mapping.excelColumn && (
                        <span className="text-muted-foreground">
                          ← {mapping.excelColumn}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {!isImporting && preview && preview.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Preview ({parsedData?.length || 0} publicações válidas)
                </h4>
                <div className="border rounded-lg p-3 bg-muted/30 max-h-[220px] overflow-y-auto space-y-3">
                  {preview.map((post, i) => (
                    <div key={i} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {post.displayUrl ? (
                          <img
                            src={post.displayUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {post.ownerUsername ? `@${post.ownerUsername}` : "Sem username"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {post.caption?.substring(0, 40) || "Sem legenda"}...
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>❤️ {post.likesCount?.toLocaleString()}</span>
                          <span>💬 {post.commentsCount?.toLocaleString()}</span>
                          <span>📸 {getImageCount(post)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {parsedData && parsedData.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {parsedData.length - 5} mais publicações...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {!isImporting && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleBatchImport}
                  disabled={!parsedData || parsedData.length === 0 || externalIsImporting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parsedData?.length || 0} Posts
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
