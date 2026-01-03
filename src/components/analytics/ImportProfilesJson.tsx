import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileJson, CheckCircle, AlertCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInstagramProfiles } from "@/hooks/useInstagramProfiles";

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

interface PreviewData {
  total: number;
  allowed: number;
  excluded: number;
  profiles: {
    username: string;
    followers: number;
    posts: number;
    allowed: boolean;
  }[];
}

export function ImportProfilesJson() {
  const { importProfiles, isImporting } = useInstagramProfiles();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const profiles = Array.isArray(json) ? json : [json];
        
        setRawData(profiles);

        // Create preview
        const previewProfiles = profiles.map(p => ({
          username: p.username,
          followers: p.followersCount || 0,
          posts: p.postsCount || 0,
          allowed: ALLOWED_ACCOUNTS.includes(p.username),
        }));

        setPreview({
          total: profiles.length,
          allowed: previewProfiles.filter(p => p.allowed).length,
          excluded: previewProfiles.filter(p => !p.allowed).length,
          profiles: previewProfiles.sort((a, b) => (b.allowed ? 1 : 0) - (a.allowed ? 1 : 0)),
        });
      } catch (err) {
        console.error("Error parsing JSON:", err);
        setPreview(null);
        setRawData(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(() => {
    if (!rawData) return;
    importProfiles(rawData);
    setPreview(null);
    setRawData(null);
    setFileName("");
  }, [rawData, importProfiles]);

  const handleCancel = useCallback(() => {
    setPreview(null);
    setRawData(null);
    setFileName("");
  }, []);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          Importar Perfis (JSON)
        </CardTitle>
        <CardDescription className="text-xs">
          Ficheiro JSON do Instagram Profile Scraper com dados de perfis e posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div className="flex flex-col items-center gap-3">
            <label className="w-full">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar ficheiro JSON
                </span>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
                disabled={isImporting}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-2 text-sm">
              <FileJson className="h-4 w-4 text-primary" />
              <span className="font-medium">{fileName}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                <span className="text-lg font-bold">{preview.total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-green-500/10 rounded-lg">
                <span className="text-lg font-bold text-green-600">{preview.allowed}</span>
                <span className="text-xs text-muted-foreground">A importar</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-red-500/10 rounded-lg">
                <span className="text-lg font-bold text-red-600">{preview.excluded}</span>
                <span className="text-xs text-muted-foreground">Excluídos</span>
              </div>
            </div>

            {/* Profile list */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.profiles.map((profile) => (
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
                    <Badge variant="outline" className="text-xs">
                      {profile.posts} posts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={isImporting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={isImporting || preview.allowed === 0}
              >
                {isImporting ? "A importar..." : `Importar ${preview.allowed} perfis`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
