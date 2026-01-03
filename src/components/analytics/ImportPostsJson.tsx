import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileJson, Upload, CheckCircle, AlertCircle, Calendar, Users, Image, Video, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ALLOWED_ACCOUNTS = [
  "frederico.m.carvalho",
  "mariiana.ai",
  "marcogouveia.pt",
  "martimsilvai",
  "robs.cortez",
  "escolamarketingdigital.pt",
  "paulofaustino",
  "samurairt",
];

const MIN_DATE = new Date("2025-01-01T00:00:00Z");

interface PostScraperPost {
  url: string;
  shortCode: string;
  type: string;
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  displayUrl?: string;
  timestamp?: string;
  ownerUsername?: string;
  locationName?: string;
  dimensionsWidth?: number;
  dimensionsHeight?: number;
  videoDuration?: number;
  images?: string[];
  childPosts?: { displayUrl?: string }[];
}

interface AccountStats {
  username: string;
  total: number;
  toImport: number;
  excludedByDate: number;
  types: { [key: string]: number };
}

interface ImportProgress {
  imported: number;
  duplicates: number;
  failed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
}

export function ImportPostsJson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<PostScraperPost[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const isAllowedAccount = useCallback((username: string) => {
    const normalized = username?.toLowerCase().replace(/^@/, "");
    return ALLOWED_ACCOUNTS.some(acc => acc.toLowerCase() === normalized);
  }, []);

  const isValidDate = useCallback((timestamp: string) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return date >= MIN_DATE;
  }, []);

  // Calculate statistics from parsed data
  const stats = useMemo(() => {
    if (!parsedData) return null;

    const accountMap = new Map<string, AccountStats>();
    let totalExcludedByAccount = 0;
    let totalExcludedByDate = 0;
    let totalToImport = 0;

    parsedData.forEach(post => {
      const username = post.ownerUsername?.toLowerCase().replace(/^@/, "") || "unknown";
      const isAllowed = isAllowedAccount(username);
      const isValid = isValidDate(post.timestamp || "");

      if (!isAllowed) {
        totalExcludedByAccount++;
        return;
      }

      if (!accountMap.has(username)) {
        accountMap.set(username, {
          username,
          total: 0,
          toImport: 0,
          excludedByDate: 0,
          types: {},
        });
      }

      const acc = accountMap.get(username)!;
      acc.total++;
      acc.types[post.type] = (acc.types[post.type] || 0) + 1;

      if (isValid) {
        acc.toImport++;
        totalToImport++;
      } else {
        acc.excludedByDate++;
        totalExcludedByDate++;
      }
    });

    return {
      total: parsedData.length,
      toImport: totalToImport,
      excludedByAccount: totalExcludedByAccount,
      excludedByDate: totalExcludedByDate,
      accounts: Array.from(accountMap.values()).sort((a, b) => b.toImport - a.toImport),
    };
  }, [parsedData, isAllowedAccount, isValidDate]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setProgress(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const posts = Array.isArray(json) ? json : [json];
        setParsedData(posts);
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast.error("Erro ao ler ficheiro JSON");
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedData || !user) return;

    // Filter posts for import
    const postsToImport = parsedData.filter(post => {
      const username = post.ownerUsername?.toLowerCase().replace(/^@/, "") || "";
      return isAllowedAccount(username) && isValidDate(post.timestamp || "");
    });

    if (postsToImport.length === 0) {
      toast.error("Nenhum post válido para importar");
      return;
    }

    setIsImporting(true);
    const BATCH_SIZE = 25;
    const totalBatches = Math.ceil(postsToImport.length / BATCH_SIZE);

    setProgress({
      imported: 0,
      duplicates: 0,
      failed: 0,
      total: postsToImport.length,
      currentBatch: 0,
      totalBatches,
    });

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < postsToImport.length; i += BATCH_SIZE) {
        const batch = postsToImport.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

        setProgress(prev => prev ? { ...prev, currentBatch } : null);

        const { data, error } = await supabase.functions.invoke("import-instagram-data", {
          body: batch,
        });

        if (error) {
          console.error("Batch import error:", error);
          totalFailed += batch.length;
        } else {
          totalImported += data?.imported || 0;
          totalDuplicates += data?.duplicates || 0;
          totalFailed += data?.failed || 0;
        }

        setProgress(prev => prev ? {
          ...prev,
          imported: totalImported,
          duplicates: totalDuplicates,
          failed: totalFailed,
        } : null);

        // Small delay between batches
        if (i + BATCH_SIZE < postsToImport.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(`Importados ${totalImported} posts (${totalDuplicates} duplicados ignorados)`);
      queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });

      // Reset state
      setParsedData(null);
      setFileName("");
      setIsOpen(false);
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erro durante a importação");
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, user, isAllowedAccount, isValidDate, queryClient]);

  const handleCancel = useCallback(() => {
    setParsedData(null);
    setFileName("");
    setProgress(null);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "video":
      case "reel":
        return <Video className="h-3 w-3" />;
      case "sidecar":
      case "carousel":
        return <Layers className="h-3 w-3" />;
      default:
        return <Image className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileJson className="h-4 w-4" />
          Importar JSON (Posts)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Importar Posts do Post Scraper
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isImporting && progress ? (
            <div className="space-y-4 py-6">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">A importar posts...</div>
                <div className="text-sm text-muted-foreground">
                  Batch {progress.currentBatch} de {progress.totalBatches}
                </div>
              </div>
              <Progress value={(progress.imported + progress.duplicates + progress.failed) / progress.total * 100} />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{progress.imported}</div>
                  <div className="text-xs text-muted-foreground">Importados</div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{progress.duplicates}</div>
                  <div className="text-xs text-muted-foreground">Duplicados</div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{progress.failed}</div>
                  <div className="text-xs text-muted-foreground">Falhados</div>
                </div>
              </div>
            </div>
          ) : !parsedData ? (
            <div className="py-6">
              <label className="w-full cursor-pointer">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">Clique para selecionar ficheiro JSON</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Formato: Instagram Post Scraper
                  </span>
                </div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : stats ? (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {/* File info */}
                <div className="flex items-center gap-2 text-sm">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span className="font-medium">{fileName}</span>
                  <Badge variant="outline">{stats.total} posts</Badge>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-lg font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-600">{stats.toImport}</div>
                    <div className="text-xs text-muted-foreground">A importar</div>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">{stats.excludedByDate}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Calendar className="h-3 w-3" />
                      &lt; 2025
                    </div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">{stats.excludedByAccount}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      Outras
                    </div>
                  </div>
                </div>

                {/* Per-account breakdown */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Posts por Conta</div>
                  {stats.accounts.map(acc => (
                    <div
                      key={acc.username}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">@{acc.username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {Object.entries(acc.types).map(([type, count]) => (
                            <Badge key={type} variant="outline" className="text-xs gap-1">
                              {getTypeIcon(type)}
                              {count}
                            </Badge>
                          ))}
                        </div>
                        <Badge className="bg-green-600">{acc.toImport} posts</Badge>
                        {acc.excludedByDate > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            -{acc.excludedByDate} antigos
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-muted-foreground">
                    <strong className="text-foreground">Nota:</strong> Posts duplicados serão automaticamente ignorados (verificação por shortcode).
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </div>

        {/* Actions */}
        {parsedData && !isImporting && (
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={!stats || stats.toImport === 0}
            >
              Importar {stats?.toImport || 0} posts
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
