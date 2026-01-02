import { useState, useRef, useMemo } from "react";
import { Upload, FileSpreadsheet, Loader2, ImageIcon, CheckCircle2, XCircle, AlertCircle, Star, Calendar, Users } from "lucide-react";
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
import { format } from "date-fns";
import { pt } from "date-fns/locale";

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

interface AccountStats {
  username: string;
  postCount: number;
  oldestPost: Date | null;
  newestPost: Date | null;
  totalLikes: number;
  totalComments: number;
}

const BATCH_SIZE = 25;

// Main account to highlight
const MY_ACCOUNT = "frederico.m.carvalho";

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
    { name: "shortCode", label: "Shortcode", keys: ["shortCode", "shortcode", "code"] },
    { name: "url", label: "URL", keys: ["url", "URL", "postUrl", "inputUrl", "link"] },
    { name: "ownerUsername", label: "Username", keys: ["ownerUsername", "username", "owner", "account"] },
    { name: "caption", label: "Legenda", keys: ["caption", "Caption", "text", "description"] },
    { name: "likesCount", label: "Likes", keys: ["likesCount", "likes", "Likes", "likeCount"] },
    { name: "commentsCount", label: "Comentários", keys: ["commentsCount", "comments", "Comments", "commentCount"] },
    { name: "displayUrl", label: "Imagem", keys: ["displayUrl", "imageUrl", "thumbnailUrl", "image", "thumbnail"] },
    { name: "timestamp", label: "Data", keys: ["timestamp", "date", "postedAt", "createdAt", "publishedAt"] },
    { name: "type", label: "Tipo", keys: ["type", "Type", "postType", "mediaType"] },
    { name: "videoViewCount", label: "Views", keys: ["videoViewCount", "videoPlayCount", "views", "Views", "playCount"] },
  ];

  // Calculate statistics per account
  const accountStats = useMemo((): AccountStats[] => {
    if (!parsedData || parsedData.length === 0) return [];

    const statsMap = new Map<string, AccountStats>();

    for (const post of parsedData) {
      const username = normalizeUsername(post.ownerUsername) || "desconhecido";
      
      const existing = statsMap.get(username) || {
        username,
        postCount: 0,
        oldestPost: null,
        newestPost: null,
        totalLikes: 0,
        totalComments: 0,
      };

      existing.postCount++;
      existing.totalLikes += post.likesCount || 0;
      existing.totalComments += post.commentsCount || 0;

      // Parse date
      if (post.timestamp) {
        const postDate = new Date(post.timestamp);
        if (!isNaN(postDate.getTime())) {
          if (!existing.oldestPost || postDate < existing.oldestPost) {
            existing.oldestPost = postDate;
          }
          if (!existing.newestPost || postDate > existing.newestPost) {
            existing.newestPost = postDate;
          }
        }
      }

      statsMap.set(username, existing);
    }

    // Sort: my account first, then by post count
    return Array.from(statsMap.values()).sort((a, b) => {
      const aIsMine = a.username.toLowerCase() === MY_ACCOUNT.toLowerCase();
      const bIsMine = b.username.toLowerCase() === MY_ACCOUNT.toLowerCase();
      if (aIsMine && !bIsMine) return -1;
      if (bIsMine && !aIsMine) return 1;
      return b.postCount - a.postCount;
    });
  }, [parsedData]);

  // Get overall date range
  const dateRange = useMemo(() => {
    if (accountStats.length === 0) return null;
    
    let oldest: Date | null = null;
    let newest: Date | null = null;
    
    for (const acc of accountStats) {
      if (acc.oldestPost && (!oldest || acc.oldestPost < oldest)) {
        oldest = acc.oldestPost;
      }
      if (acc.newestPost && (!newest || acc.newestPost > newest)) {
        newest = acc.newestPost;
      }
    }
    
    return oldest && newest ? { oldest, newest } : null;
  }, [accountStats]);

  const normalizeUsername = (username: string | undefined): string => {
    if (!username) return "";
    // Remove @ if present, lowercase, trim
    return username.replace(/^@/, "").toLowerCase().trim();
  };

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
        url: row.url || row.URL || row.postUrl || row.inputUrl || row.link,
        shortCode: row.shortCode || row.shortcode || row.code || extractShortcode(row.url || row.inputUrl || row.link),
        type: normalizePostType(row.type || row.Type || row.postType || row.mediaType || "Image"),
        caption: row.caption || row.Caption || row.text || row.description || "",
        hashtags: parseHashtags(row.hashtags || row.caption),
        likesCount: parseInt(row.likesCount || row.likes || row.Likes || row.likeCount || 0),
        commentsCount: parseInt(row.commentsCount || row.comments || row.Comments || row.commentCount || 0),
        videoViewCount: parseInt(row.videoViewCount || row.views || row.Views || row.videoPlayCount || row.playCount || 0),
        displayUrl: row.displayUrl || row.imageUrl || row.thumbnailUrl || row.image || row.thumbnail,
        images: parseImages(row.images),
        timestamp: row.timestamp || row.date || row.postedAt || row.createdAt || row.publishedAt,
        locationName: row.locationName || row.location,
        ownerUsername: normalizeUsername(row.ownerUsername || row.username || row.owner || row.account),
        ownerFullName: row.ownerFullName || row.fullName || "",
        followersCount: parseInt(row.followersCount || row.followers || 0),
        isSponsored: row.isSponsored === true || row.isSponsored === "true",
        dimensionsWidth: parseInt(row.dimensionsWidth || row.width || 0),
        dimensionsHeight: parseInt(row.dimensionsHeight || row.height || 0),
        isVideo: row.isVideo === true || row.type === "Video" || row.type === "Reel",
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

  const normalizePostType = (type: string): string => {
    const lower = type.toLowerCase();
    if (lower === "sidecar" || lower === "carousel" || lower === "album") return "Carrossel";
    if (lower === "video" || lower === "reel") return "Video";
    if (lower === "image" || lower === "photo") return "Image";
    return type;
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

  const formatDateRange = (oldest: Date, newest: Date): string => {
    const oldestStr = format(oldest, "MMM yyyy", { locale: pt });
    const newestStr = format(newest, "MMM yyyy", { locale: pt });
    if (oldestStr === newestStr) return oldestStr;
    return `${oldestStr} - ${newestStr}`;
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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

            {/* Account Statistics Summary */}
            {!isImporting && accountStats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contas Detectadas ({accountStats.length})
                  </h4>
                  {dateRange && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateRange(dateRange.oldest, dateRange.newest)}
                    </span>
                  )}
                </div>
                <div className="border rounded-lg bg-muted/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Conta</th>
                        <th className="text-right p-2 font-medium">Posts</th>
                        <th className="text-right p-2 font-medium">Período</th>
                        <th className="text-right p-2 font-medium">Likes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountStats.map((acc) => {
                        const isMyAccount = acc.username.toLowerCase() === MY_ACCOUNT.toLowerCase();
                        return (
                          <tr 
                            key={acc.username} 
                            className={isMyAccount ? "bg-amber-500/10 border-l-2 border-l-amber-500" : ""}
                          >
                            <td className="p-2">
                              <span className="flex items-center gap-1.5">
                                {isMyAccount && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                <span className={isMyAccount ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                                  @{acc.username}
                                </span>
                                {isMyAccount && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 rounded">
                                    Você
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="text-right p-2 tabular-nums">{acc.postCount}</td>
                            <td className="text-right p-2 text-muted-foreground">
                              {acc.oldestPost && acc.newestPost 
                                ? formatDateRange(acc.oldestPost, acc.newestPost)
                                : "-"
                              }
                            </td>
                            <td className="text-right p-2 tabular-nums">
                              {acc.totalLikes.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/50 font-medium">
                        <td className="p-2">Total</td>
                        <td className="text-right p-2 tabular-nums">
                          {accountStats.reduce((sum, a) => sum + a.postCount, 0)}
                        </td>
                        <td className="text-right p-2">-</td>
                        <td className="text-right p-2 tabular-nums">
                          {accountStats.reduce((sum, a) => sum + a.totalLikes, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Column Mapping Validation */}
            {!isImporting && columnMappings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  Mapeamento de Colunas
                  <span className="text-xs text-muted-foreground">
                    ({columnMappings.filter(m => m.mapped).length}/{columnMappings.length} detectadas)
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
                  Preview dos Dados
                </h4>
                <div className="border rounded-lg p-3 bg-muted/30 max-h-[180px] overflow-y-auto space-y-3">
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
                          {post.ownerUsername?.toLowerCase() === MY_ACCOUNT.toLowerCase() && (
                            <Star className="inline h-3 w-3 text-amber-500 fill-amber-500 ml-1" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {post.caption?.substring(0, 40) || "Sem legenda"}...
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>❤️ {post.likesCount?.toLocaleString()}</span>
                          <span>💬 {post.commentsCount?.toLocaleString()}</span>
                          <span className="text-[10px] bg-muted px-1 rounded">{post.type}</span>
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
