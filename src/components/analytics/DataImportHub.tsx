import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { MODO_HUB_LOCAL } from "@/lib/backendHub";
import { useProjetoOpcional } from "@/contexts/ProjetoContext";
import { useInstagramProfiles } from "@/hooks/useInstagramProfiles";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  Image,
  Video,
  Layers,
  Database,
} from "lucide-react";

const MIN_DATE = new Date("2025-01-01T00:00:00Z");
const MY_ACCOUNT = "frederico.m.carvalho";
const BATCH_SIZE = 25;
function contagemFicheiro(valor: unknown): number {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || String(valor).trim() === '') throw new Error('Faltam contagens no ficheiro. Usa gostos e comentários explícitos, incluindo zero quando confirmado.');
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 0) throw new Error('As contagens têm de ser números inteiros iguais ou superiores a zero.');
  return numero;
}

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
}

export function DataImportHub() {
  const projetoId = useProjetoOpcional()?.projetoId ?? null;
  const queryClient = useQueryClient();
  const { importProfilesAsync, isImporting: isImportingProfiles } = useInstagramProfiles();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("excel");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  
  // Excel state
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelStats, setExcelStats] = useState<{ toImport: number; excluded: number } | null>(null);
  
  // JSON Posts state
  const [jsonPostsData, setJsonPostsData] = useState<any[] | null>(null);
  const [jsonPostsFileName, setJsonPostsFileName] = useState("");
  
  // JSON Profiles state
  const [jsonProfilesData, setJsonProfilesData] = useState<any[] | null>(null);
  const [jsonProfilesFileName, setJsonProfilesFileName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions
  const isAllowedAccount = useCallback((username: string) => {
    const normalized = username?.toLowerCase().replace(/^@/, "").trim();
    return typeof normalized === "string" && /^[a-z0-9._]{1,30}$/.test(normalized);
  }, []);

  const isValidDate = useCallback((timestamp: string) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date >= MIN_DATE;
  }, []);

  const normalizeUsername = (username: string | undefined): string => {
    if (!username) return "";
    return username.replace(/^@/, "").toLowerCase().trim();
  };

  const normalizePostType = (type: string): string => {
    const lower = type?.toLowerCase() || "";
    if (lower === "sidecar" || lower === "carousel" || lower === "album") return "Carrossel";
    if (lower === "video" || lower === "reel") return "Video";
    if (lower === "image" || lower === "photo") return "Image";
    return type || "Image";
  };

  const parseHashtags = (text: string | undefined): string[] => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    const matches = String(text).match(/#\w+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  };

  // JSON Posts stats
  const jsonPostsStats = useMemo(() => {
    if (!jsonPostsData) return null;

    let toImport = 0;
    let excludedByAccount = 0;
    let excludedByDate = 0;
    const accountMap = new Map<string, { count: number; types: Record<string, number> }>();

    jsonPostsData.forEach(post => {
      const username = normalizeUsername(post.ownerUsername);
      
      if (!isAllowedAccount(username) || typeof post.shortCode !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(post.shortCode)) {
        excludedByAccount++;
        return;
      }

      if (!isValidDate(post.timestamp)) {
        excludedByDate++;
        return;
      }

      toImport++;
      const acc = accountMap.get(username) || { count: 0, types: {} };
      acc.count++;
      acc.types[post.type || "Image"] = (acc.types[post.type || "Image"] || 0) + 1;
      accountMap.set(username, acc);
    });

    return {
      total: jsonPostsData.length,
      toImport,
      excludedByAccount,
      excludedByDate,
      accounts: Array.from(accountMap.entries())
        .map(([username, data]) => ({ username, ...data }))
        .sort((a, b) => b.count - a.count),
    };
  }, [jsonPostsData, isAllowedAccount, isValidDate]);

  // JSON Profiles stats
  const jsonProfilesStats = useMemo(() => {
    if (!jsonProfilesData) return null;

    const allowed = jsonProfilesData.filter(p => isAllowedAccount(p.username));
    return {
      total: jsonProfilesData.length,
      allowed: allowed.length,
      excluded: jsonProfilesData.length - allowed.length,
      profiles: jsonProfilesData.map(p => ({
        username: p.username,
        followers: p.followersCount || 0,
        posts: p.postsCount || 0,
        allowed: isAllowedAccount(p.username),
      })).sort((a, b) => (b.allowed ? 1 : 0) - (a.allowed ? 1 : 0)),
    };
  }, [jsonProfilesData, isAllowedAccount]);

  // Handle Excel file
  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("O ficheiro excede 20 MB. Divide-o em ficheiros mais pequenos."); return; }

    setExcelData(null); setExcelStats(null);
    setExcelFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map and filter data
      const mappedData = jsonData.map((row: any) => ({
        url: row.url || row.URL || row.postUrl || row.inputUrl || row.link,
        shortCode: row.shortCode || row.shortcode || row.code || String(row.url || row.URL || row.postUrl || row.inputUrl || row.link || "").match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1],
        type: normalizePostType(row.type || row.Type || row.postType),
        caption: row.caption || row.Caption || "",
        hashtags: parseHashtags(row.hashtags || row.caption),
        likesCount: contagemFicheiro(row.likesCount ?? row.likes),
        commentsCount: contagemFicheiro(row.commentsCount ?? row.comments),
        videoViewCount: parseInt(row.videoViewCount || row.views || row.videoPlayCount || 0),
        displayUrl: row.displayUrl || row.imageUrl || row.thumbnailUrl,
        timestamp: row.timestamp || row.date || row.postedAt,
        ownerUsername: normalizeUsername(row.ownerUsername || row.username),
        locationName: row.locationName || row.location,
      }));

      const filtered = mappedData.filter(p =>
        isAllowedAccount(p.ownerUsername) && isValidDate(p.timestamp) && typeof p.shortCode === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(p.shortCode)
      );

      setExcelData(filtered);
      setExcelStats({
        toImport: filtered.length,
        excluded: mappedData.length - filtered.length,
      });
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao ler ficheiro Excel");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle JSON Posts file
  const handleJsonPostsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("O ficheiro excede 20 MB. Divide-o em ficheiros mais pequenos."); return; }

    setJsonPostsData(null);
    setJsonPostsFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const itens = Array.isArray(json) ? json : [json];
        if (!itens.length || itens.length > 10000 || itens.some(p => !p || typeof p !== 'object' || Array.isArray(p))) throw new Error('Formato inválido.');
        setJsonPostsData(itens.map(p => ({...p, likesCount: contagemFicheiro(p.likesCount), commentsCount: contagemFicheiro(p.commentsCount), ownerUsername: normalizeUsername(p.ownerUsername), shortCode: p.shortCode || String(p.url || '').match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1]})));
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast.error(err instanceof Error ? err.message : "Erro ao ler ficheiro JSON");
      }
    };
    reader.readAsText(file);
  };

  // Handle JSON Profiles file
  const handleJsonProfilesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("O ficheiro excede 20 MB. Divide-o em ficheiros mais pequenos."); return; }

    setJsonProfilesData(null);
    setJsonProfilesFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const itens = Array.isArray(json) ? json : [json];
        if (!itens.length || itens.length > 1000 || itens.some(p => !p || typeof p !== 'object' || Array.isArray(p))) throw new Error('Formato inválido.');
        setJsonProfilesData(itens.map(p => ({...p, username: normalizeUsername(p.username)})));
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast.error(err instanceof Error ? err.message : "Erro ao ler ficheiro JSON");
      }
    };
    reader.readAsText(file);
  };

  // Import Excel/JSON Posts
  const handleImportPosts = async (data: any[]) => {
    if (MODO_HUB_LOCAL || !data || data.length === 0) return;

    setIsImporting(true);
    setProgress({ current: 0, total: data.length, imported: 0, duplicates: 0, failed: 0 });

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));

      try {
        const { data: result, error } = await supabase.functions.invoke("import-instagram-data", {
          body: { posts: batch, project_id: projetoId },
        });

        if (error || result?.success === false || !result || result.error) {
          totalFailed += batch.length;
        } else {
          totalImported += result?.imported || 0;
          totalDuplicates += result?.duplicates || 0;
          totalFailed += Math.max(0, batch.length - (result.imported || 0) - (result.duplicates || 0) - (result.skippedOldPosts || 0));
        }
      } catch (err) {
        totalFailed += batch.length;
      }

      setProgress({
        current: Math.min(i + BATCH_SIZE, data.length),
        total: data.length,
        imported: totalImported,
        duplicates: totalDuplicates,
        failed: totalFailed,
      });
    }

    if (totalImported > 0) {
      toast.success(`${totalImported} posts importados com sucesso!`);
    } else if (totalDuplicates > 0) {
      toast.info(`Todos os ${totalDuplicates} posts já existiam`);
    }

    queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });
    
    setIsImporting(false);
    if (totalFailed > 0) toast.error(`${totalFailed} registos sem confirmação. Os ficheiros foram preservados para revisão.`);
  };

  // Import Profiles
  const handleImportProfiles = async () => {
    if (MODO_HUB_LOCAL || !jsonProfilesData) return;
    setIsImporting(true);
    try {
      const validos = jsonProfilesData.filter(p => isAllowedAccount(p.username));
      for (let i = 0; i < validos.length; i += BATCH_SIZE) await importProfilesAsync(validos.slice(i, i + BATCH_SIZE));
      resetState();
    } catch { /* The mutation reports the error; preserve the file for explicit retry. */ }
    finally { setIsImporting(false); }
  };

  const resetState = () => {
    setIsImporting(false);
    setProgress(null);
    setExcelData(null);
    setExcelFileName("");
    setExcelStats(null);
    setJsonPostsData(null);
    setJsonPostsFileName("");
    setJsonProfilesData(null);
    setJsonProfilesFileName("");
    setIsOpen(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "video":
      case "reel":
        return <Video className="h-3 w-3" />;
      case "sidecar":
      case "carousel":
      case "carrossel":
        return <Layers className="h-3 w-3" />;
      default:
        return <Image className="h-3 w-3" />;
    }
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isImporting && setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Importar Instagram
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Importar dados do Instagram
          </DialogTitle>
          <DialogDescription>Carrega um ficheiro que já possuis; o Hub não recolhe dados do Instagram. Publicações desde janeiro de 2025. Destino: {projetoId ? "projeto selecionado no Hub" : "a tua conta, sem projeto associado"}. Novas medições de publicações já importadas não são atualizadas automaticamente.</DialogDescription>
        </DialogHeader>

        {MODO_HUB_LOCAL && <p role="note" className="rounded-lg border bg-accent p-3 text-sm">Podes rever um ficheiro nesta demonstração. A gravação e os pedidos ao servidor estão desligados; os teus dados Cloud não são consultados nem alterados.</p>}
        <details className="rounded-lg border bg-muted/40 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Que ficheiros posso carregar?</summary>
          <p className="mt-2 text-muted-foreground">Excel: colunas ownerUsername (ou username), shortCode (ou URL da publicação), timestamp (data ISO), likesCount e commentsCount. JSON: lista de publicações com os mesmos nomes. Perfis JSON: username, id e followersCount. Os formatos das exportações variam; não aceitamos automaticamente qualquer exportação da Meta.</p>
          <p className="mt-2 text-muted-foreground">As datas e contagens vêm do teu ficheiro. Revê os totais antes de importar. Imagens referidas podem ser copiadas para a biblioteca pelo servidor; não é uma pesquisa de novas publicações.</p>
        </details>
        {progress ? (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">{isImporting ? "A importar…" : progress.failed ? "Importação por rever" : "Importação concluída"}</div>
              <div className="text-sm text-muted-foreground">{progressPercent}%</div>
            </div>
            <Progress value={progressPercent} />
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
            {!isImporting && <Button variant="outline" onClick={() => setProgress(null)}>Voltar aos ficheiros</Button>}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="flex h-auto w-full flex-wrap gap-1">
              <TabsTrigger value="excel" className="gap-2 text-xs sm:text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Excel</span>
              </TabsTrigger>
              <TabsTrigger value="json-posts" className="gap-2 text-xs sm:text-sm">
                <FileJson className="h-4 w-4" />
                <span>Publicações JSON</span>
              </TabsTrigger>
              <TabsTrigger value="json-profiles" className="gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span>Perfis JSON</span>
              </TabsTrigger>
            </TabsList>

            {/* Excel Tab */}
            <TabsContent value="excel" className="mt-4">
              {!excelData ? (
                <label className="block cursor-pointer">
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Carregar ficheiro Excel (.xlsx)</span>
                    <span className="text-xs text-muted-foreground mt-1">Posts do Instagram</span>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcelFile}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="font-medium">{excelFileName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <div className="text-xl font-bold text-green-600">{excelStats?.toImport}</div>
                      <div className="text-xs text-muted-foreground">A importar</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-xl font-bold">{excelStats?.excluded}</div>
                      <div className="text-xs text-muted-foreground">Excluídos</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setExcelData(null); setExcelFileName(""); }}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" disabled={MODO_HUB_LOCAL || excelData.length === 0} onClick={() => { void handleImportPosts(excelData); }}>
                      Importar {excelStats?.toImport} posts
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* JSON Posts Tab */}
            <TabsContent value="json-posts" className="mt-4">
              {!jsonPostsData ? (
                <label className="block cursor-pointer">
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                    <FileJson className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Carregar ficheiro JSON</span>
                    <span className="text-xs text-muted-foreground mt-1">Instagram Post Scraper</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleJsonPostsFile}
                  />
                </label>
              ) : jsonPostsStats ? (
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 pr-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FileJson className="h-4 w-4 text-primary" />
                      <span className="font-medium">{jsonPostsFileName}</span>
                      <Badge variant="outline">{jsonPostsStats.total} posts</Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">{jsonPostsStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-lg text-center">
                        <div className="text-lg font-bold text-green-600">{jsonPostsStats.toImport}</div>
                        <div className="text-xs text-muted-foreground">A importar</div>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-lg text-center">
                        <div className="text-lg font-bold text-yellow-600">{jsonPostsStats.excludedByDate}</div>
                        <div className="text-xs text-muted-foreground">&lt; 2025</div>
                      </div>
                      <div className="p-2 bg-red-500/10 rounded-lg text-center">
                        <div className="text-lg font-bold text-red-600">{jsonPostsStats.excludedByAccount}</div>
                        <div className="text-xs text-muted-foreground">Identificação inválida</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Posts por Conta</div>
                      {jsonPostsStats.accounts.map(acc => (
                        <div key={acc.username} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className={acc.username === MY_ACCOUNT ? "font-semibold text-amber-600" : "font-medium"}>
                              @{acc.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {Object.entries(acc.types).map(([type, count]) => (
                              <Badge key={type} variant="outline" className="text-xs gap-1">
                                {getTypeIcon(type)}
                                {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setJsonPostsData(null); setJsonPostsFileName(""); }}>
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={() => {
                          const filtered = jsonPostsData.filter(p => 
                            isAllowedAccount(normalizeUsername(p.ownerUsername)) && isValidDate(p.timestamp) && typeof p.shortCode === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(p.shortCode)
                          );
                          handleImportPosts(filtered);
                        }}
                        disabled={MODO_HUB_LOCAL || jsonPostsStats.toImport === 0}
                      >
                        Importar {jsonPostsStats.toImport} posts
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </TabsContent>

            {/* JSON Profiles Tab */}
            <TabsContent value="json-profiles" className="mt-4">
              {!jsonProfilesData ? (
                <label className="block cursor-pointer">
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                    <Users className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Carregar ficheiro JSON</span>
                    <span className="text-xs text-muted-foreground mt-1">Instagram Profile Scraper</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleJsonProfilesFile}
                  />
                </label>
              ) : jsonProfilesStats ? (
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-4 pr-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{jsonProfilesFileName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">{jsonProfilesStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg text-center">
                        <div className="text-lg font-bold text-green-600">{jsonProfilesStats.allowed}</div>
                        <div className="text-xs text-muted-foreground">A importar</div>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg text-center">
                        <div className="text-lg font-bold text-red-600">{jsonProfilesStats.excluded}</div>
                        <div className="text-xs text-muted-foreground">Excluídos</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {jsonProfilesStats.profiles.map(profile => (
                        <div
                          key={profile.username}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            profile.allowed ? "bg-green-500/10" : "bg-muted/50 opacity-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {profile.allowed ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={profile.allowed ? "font-medium" : ""}>
                              @{profile.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {profile.followers.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setJsonProfilesData(null); setJsonProfilesFileName(""); }}>
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => { void handleImportProfiles(); }}
                        disabled={MODO_HUB_LOCAL || jsonProfilesStats.allowed === 0 || isImporting || isImportingProfiles}
                      >
                        {isImportingProfiles ? "A importar..." : `Importar ${jsonProfilesStats.allowed} perfis`}
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
