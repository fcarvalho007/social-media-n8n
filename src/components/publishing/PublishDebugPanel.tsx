import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";

interface PublishDebugPanelProps {
  postId: string;
  targets: { instagram: boolean; linkedin: boolean };
  postType: string;
  caption: string;
  hashtags: string[];
  mediaCount: number;
  pdfMetadata?: {
    sizeMB: number;
    pages: number;
    filename: string;
  };
  pageAlts: string[];
  progress: any[];
}

export function PublishDebugPanel({
  postId,
  targets,
  postType,
  caption,
  hashtags,
  mediaCount,
  pdfMetadata,
  pageAlts,
  progress,
}: PublishDebugPanelProps) {
  const generateInstagramPayload = () => {
    if (postType === "carousel") {
      return {
        accountId: "68fb951d8bbca9c10cbfef93",
        type: "document",
        caption: `${caption}\n\n${hashtags.join(" ")}`,
        document: {
          file: "<pdf-bytes>",
          filename: pdfMetadata?.filename || "carousel.pdf",
          pageAlts: pageAlts,
        },
        headers: {
          "Idempotency-Key": postId,
        },
        metadata: pdfMetadata ? {
          sizeMB: pdfMetadata.sizeMB,
          pages: pdfMetadata.pages,
        } : null,
      };
    }
    return null;
  };

  const generateLinkedInPayload = () => {
    if (postType === "carousel") {
      // Move URLs to end
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = caption.match(urlRegex) || [];
      const textWithoutUrls = caption.replace(urlRegex, "").trim();
      const finalText = urls.length > 0 
        ? `${textWithoutUrls}\n\n${urls.join("\n")}\n\n${hashtags.join(" ")}`
        : `${caption}\n\n${hashtags.join(" ")}`;

      return {
        memberUrn: "urn:li:person:ojg2Ri_Otv",
        visibility: "PUBLIC",
        content: {
          kind: "document",
          text: finalText,
          document: {
            file: "<pdf-bytes>",
            title: postId,
            pageAlts: pageAlts,
          },
        },
        headers: {
          "Idempotency-Key": postId,
        },
        metadata: pdfMetadata ? {
          sizeMB: pdfMetadata.sizeMB,
          pages: pdfMetadata.pages,
        } : null,
      };
    }
    return null;
  };

  const copyToClipboard = (data: any, platform: string) => {
    const sanitized = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(sanitized);
    toast.success(`${platform} payload copiado`);
  };

  const exportAll = () => {
    const report = {
      postId,
      timestamp: new Date().toISOString(),
      targets,
      postType,
      mediaCount,
      pdfMetadata,
      pageAlts,
      progress: progress.map(p => ({
        platform: p.platform,
        status: p.status,
        startedAt: p.startedAt,
        publishedAt: p.publishedAt,
        postUrl: p.postUrl,
        error: p.error,
      })),
      payloads: {
        instagram: targets.instagram ? generateInstagramPayload() : null,
        linkedin: targets.linkedin ? generateLinkedInPayload() : null,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `publish-debug-${postId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  };

  const igPayload = targets.instagram ? generateInstagramPayload() : null;
  const liPayload = targets.linkedin ? generateLinkedInPayload() : null;

  return (
    <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Debug Panel — Payloads Sanitizados</CardTitle>
          </div>
          <Button onClick={exportAll} variant="outline" size="sm">
            Exportar Tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Post ID:</span> {postId}
          </div>
          <div>
            <span className="font-semibold">Tipo:</span> {postType}
          </div>
          <div>
            <span className="font-semibold">Plataformas:</span>{" "}
            {targets.instagram && <Badge variant="secondary" className="mr-1">IG</Badge>}
            {targets.linkedin && <Badge variant="secondary">LI</Badge>}
          </div>
          <div>
            <span className="font-semibold">Mídia:</span> {mediaCount} items
          </div>
        </div>

        {pdfMetadata && (
          <div className="rounded-lg bg-background p-3 space-y-1 text-sm">
            <div className="font-semibold">PDF Gerado:</div>
            <div>Ficheiro: {pdfMetadata.filename}</div>
            <div>Páginas: {pdfMetadata.pages}</div>
            <div>Tamanho: {pdfMetadata.sizeMB.toFixed(2)} MB</div>
          </div>
        )}

        {pageAlts.length > 0 && (
          <div className="rounded-lg bg-background p-3 space-y-1 text-sm">
            <div className="font-semibold">Alt-texts ({pageAlts.length}):</div>
            {pageAlts.map((alt, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                P{i + 1}: {alt || "(vazio)"}
              </div>
            ))}
          </div>
        )}

        {progress.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold text-sm">Progresso:</div>
            {progress.map((p) => (
              <div key={p.platform} className="rounded-lg bg-background p-3 space-y-1 text-xs">
                <div className="font-semibold capitalize">{p.platform}</div>
                <div>Status: {p.status}</div>
                {p.startedAt && <div>Iniciado: {new Date(p.startedAt).toISOString()}</div>}
                {p.publishedAt && <div>Publicado: {new Date(p.publishedAt).toISOString()}</div>}
                {p.postUrl && <div>URL: {p.postUrl}</div>}
                {p.error && <div className="text-destructive">Erro: {p.error}</div>}
              </div>
            ))}
          </div>
        )}

        {igPayload && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Instagram Payload:</span>
              <Button
                onClick={() => copyToClipboard(igPayload, "Instagram")}
                variant="ghost"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="rounded-lg bg-background p-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(igPayload, null, 2)}
            </pre>
          </div>
        )}

        {liPayload && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">LinkedIn Payload:</span>
              <Button
                onClick={() => copyToClipboard(liPayload, "LinkedIn")}
                variant="ghost"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="rounded-lg bg-background p-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(liPayload, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
