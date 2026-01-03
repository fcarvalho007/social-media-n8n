import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { useInstagramProfiles } from "@/hooks/useInstagramProfiles";
import * as XLSX from "xlsx";
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
const MY_ACCOUNT = "frederico.m.carvalho";
const BATCH_SIZE = 25;

interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
}

interface DataImportHubProps {
  onImport?: (posts: any[]) => void;
  isImporting?: boolean;
}

export function DataImportHub({ onImport, isImporting: externalIsImporting }: DataImportHubProps) {
  const queryClient = useQueryClient();
  const { importProfiles, isImporting: isImportingProfiles } = useInstagramProfiles();
  
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
    return ALLOWED_ACCOUNTS.some(acc => acc.toLowerCase() === normalized);
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
      
      if (!isAllowedAccount(username)) {
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

    setExcelFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map and filter data
      const mappedData = jsonData.map((row: any) => ({
        url: row.url || row.URL || row.postUrl || row.inputUrl || row.link,
        shortCode: row.shortCode || row.shortcode || row.code,
        type: normalizePostType(row.type || row.Type || row.postType),
        caption: row.caption || row.Caption || "",
        hashtags: parseHashtags(row.hashtags || row.caption),
        likesCount: parseInt(row.likesCount || row.likes || 0),
        commentsCount: parseInt(row.commentsCount || row.comments || 0),
        videoViewCount: parseInt(row.videoViewCount || row.views || row.videoPlayCount || 0),
        displayUrl: row.displayUrl || row.imageUrl || row.thumbnailUrl,
        timestamp: row.timestamp || row.date || row.postedAt,
        ownerUsername: normalizeUsername(row.ownerUsername || row.username),
        locationName: row.locationName || row.location,
      }));

      const filtered = mappedData.filter(p => 
        isAllowedAccount(p.ownerUsername) && isValidDate(p.timestamp)
      );

      setExcelData(filtered);
      setExcelStats({
        toImport: filtered.length,
        excluded: mappedData.length - filtered.length,
      });
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("Erro ao ler ficheiro Excel");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle JSON Posts file
  const handleJsonPostsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonPostsFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setJsonPostsData(Array.isArray(json) ? json : [json]);
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast.error("Erro ao ler ficheiro JSON");
      }
    };
    reader.readAsText(file);
  };

  // Handle JSON Profiles file
  const handleJsonProfilesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonProfilesFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setJsonProfilesData(Array.isArray(json) ? json : [json]);
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast.error("Erro ao ler ficheiro JSON");
      }
    };
    reader.readAsText(file);
  };

  // Import Excel/JSON Posts
  const handleImportPosts = async (data: any[]) => {
    if (!data || data.length === 0) return;

    setIsImporting(true);
    setProgress({ current: 0, total: data.length, imported: 0, duplicates: 0, failed: 0 });

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));

      try {
        const { data: result, error } = await supabase.functions.invoke("import-instagram-data", {
          body: { posts: batch },
        });

        if (error) {
          totalFailed += batch.length;
        } else {
          totalImported += result?.imported || 0;
          totalDuplicates += result?.duplicates || 0;
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
    
    setTimeout(() => {
      resetState();
    }, 1500);
  };

  // Import Profiles
  const handleImportProfiles = () => {
    if (!jsonProfilesData) return;
    importProfiles(jsonProfilesData);
    setJsonProfilesData(null);
    setJsonProfilesFileName("");
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
          Importar Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Centro de Importação de Dados
          </DialogTitle>
        </DialogHeader>

        {isImporting && progress ? (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">A importar...</div>
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
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="excel" className="gap-2 text-xs sm:text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </TabsTrigger>
              <TabsTrigger value="json-posts" className="gap-2 text-xs sm:text-sm">
                <FileJson className="h-4 w-4" />
                <span className="hidden sm:inline">JSON Posts</span>
              </TabsTrigger>
              <TabsTrigger value="json-profiles" className="gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">JSON Perfis</span>
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
                    <Button className="flex-1" onClick={() => handleImportPosts(excelData)}>
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
                        <div className="text-xs text-muted-foreground">Outras</div>
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
                            isAllowedAccount(normalizeUsername(p.ownerUsername)) && isValidDate(p.timestamp)
                          );
                          handleImportPosts(filtered);
                        }}
                        disabled={jsonPostsStats.toImport === 0}
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
                        onClick={handleImportProfiles}
                        disabled={jsonProfilesStats.allowed === 0 || isImportingProfiles}
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
