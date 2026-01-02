import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
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
        url: row.url || row.URL || row.postUrl,
        shortCode: row.shortCode || row.shortcode || extractShortcode(row.url),
        type: row.type || row.Type || "Image",
        caption: row.caption || row.Caption || row.text || "",
        hashtags: parseHashtags(row.hashtags || row.caption),
        likesCount: parseInt(row.likesCount || row.likes || row.Likes || 0),
        commentsCount: parseInt(row.commentsCount || row.comments || row.Comments || 0),
        videoViewCount: parseInt(row.videoViewCount || row.views || row.Views || 0),
        displayUrl: row.displayUrl || row.imageUrl || row.thumbnailUrl,
        timestamp: row.timestamp || row.date || row.postedAt,
        locationName: row.locationName || row.location,
        ownerUsername: row.ownerUsername || row.username,
        dimensionsWidth: parseInt(row.dimensionsWidth || row.width || 0),
        dimensionsHeight: parseInt(row.dimensionsHeight || row.height || 0),
        isVideo: row.isVideo === true || row.type === "Video",
        videoDuration: parseFloat(row.videoDuration || 0),
      }));

      setPreview(mappedData.slice(0, 5));
      console.log(`Parsed ${mappedData.length} rows from Excel`);

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
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
  };

  const parseHashtags = (text: string | undefined): string[] => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    const matches = String(text).match(/#\w+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
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
                <div className="border rounded-lg p-3 bg-muted/30 max-h-[200px] overflow-y-auto space-y-2">
                  {preview.map((post, i) => (
                    <div key={i} className="text-xs border-b border-border pb-2 last:border-0">
                      <p className="font-medium truncate">
                        {post.caption?.substring(0, 60) || "Sem legenda"}...
                      </p>
                      <p className="text-muted-foreground">
                        ❤️ {post.likesCount} · 💬 {post.commentsCount} · {post.type}
                      </p>
                    </div>
                  ))}
                  {(window as any).__excelImportData?.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {(window as any).__excelImportData.length - 5} mais...
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
