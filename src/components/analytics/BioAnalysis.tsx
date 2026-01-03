import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, AtSign, Hash, Megaphone, Mail, Phone, Calendar } from "lucide-react";
import { InstagramProfile } from "@/hooks/useInstagramProfiles";
import { InsightBox } from "./InsightBox";

interface BioAnalysisProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

const MAIN_ACCOUNT = "frederico.m.carvalho";

// Common CTA keywords
const CTA_KEYWORDS = [
  "link", "clica", "click", "👇", "⬇️", "download", "inscreve", "regista",
  "grátis", "free", "curso", "aula", "workshop", "ebook", "guia", "checklist",
  "contacto", "agenda", "marca", "reserva", "compra", "desconto"
];

// Link types detection
const detectLinkType = (url: string): string => {
  if (!url) return "Sem link";
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("linktree") || lowerUrl.includes("linktr.ee")) return "Linktree";
  if (lowerUrl.includes("bio.link") || lowerUrl.includes("linkbio")) return "Link Bio";
  if (lowerUrl.includes("beacons.ai")) return "Beacons";
  if (lowerUrl.includes("canva.site")) return "Canva Site";
  if (lowerUrl.includes("notion")) return "Notion";
  if (lowerUrl.includes("gumroad") || lowerUrl.includes("hotmart") || lowerUrl.includes("kiwify")) return "Plataforma de Vendas";
  if (lowerUrl.includes("youtube") || lowerUrl.includes("youtu.be")) return "YouTube";
  if (lowerUrl.includes("calendly") || lowerUrl.includes("cal.com")) return "Agendamento";
  return "Site Próprio";
};

// Extract CTA from bio
const extractCTAs = (bio: string): string[] => {
  if (!bio) return [];
  const lowerBio = bio.toLowerCase();
  return CTA_KEYWORDS.filter(keyword => lowerBio.includes(keyword));
};

// Extract emojis from text
const extractEmojis = (text: string): string[] => {
  if (!text) return [];
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return [...new Set(text.match(emojiRegex) || [])];
};

export function BioAnalysis({ profiles, mainAccount = MAIN_ACCOUNT }: BioAnalysisProps) {
  // Sort with main account first
  const sortedProfiles = [...profiles].sort((a, b) => {
    if (a.username === mainAccount) return -1;
    if (b.username === mainAccount) return 1;
    return b.followers_count - a.followers_count;
  });

  // Aggregate stats
  const linkTypes = sortedProfiles.map(p => ({
    username: p.username,
    type: detectLinkType(p.external_url || ""),
  }));

  const linkTypeCount = linkTypes.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonLinkType = Object.entries(linkTypeCount)
    .sort((a, b) => b[1] - a[1])[0];

  const ctaCounts = sortedProfiles.map(p => ({
    username: p.username,
    ctas: extractCTAs(p.biography || ""),
  }));

  const avgCTAs = ctaCounts.reduce((sum, p) => sum + p.ctas.length, 0) / profiles.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Análise de Bios e Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <InsightBox
          title="Análise de Bios"
          description="Comparação de estratégias de bio e links externos entre contas."
          insights={{
            forYou: `Tipo de link mais comum: ${mostCommonLinkType?.[0]} (${mostCommonLinkType?.[1]} contas)`,
            fromData: `${profiles.filter(p => p.external_url).length} de ${profiles.length} contas têm link externo • Média de ${avgCTAs.toFixed(1)} CTAs por bio`,
          }}
        />

        {/* Bio Cards */}
        <div className="space-y-3">
          {sortedProfiles.map((profile) => {
            const isMain = profile.username === mainAccount;
            const linkType = detectLinkType(profile.external_url || "");
            const ctas = extractCTAs(profile.biography || "");
            const emojis = extractEmojis(profile.biography || "");
            
            return (
              <div
                key={profile.id}
                className={`p-3 rounded-lg border ${isMain ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/30"}`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.profile_pic_url || undefined} />
                    <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className={`font-medium text-sm ${isMain ? "text-amber-600" : ""}`}>
                    @{profile.username}
                  </span>
                  {isMain && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600">
                      Principal
                    </Badge>
                  )}
                </div>

                {/* Bio Text */}
                {profile.biography ? (
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                    {profile.biography}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic mb-3">
                    Sem bio definida
                  </p>
                )}

                {/* Analysis Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {/* Link Type */}
                  <Badge variant="secondary" className="text-xs">
                    <Link2 className="h-3 w-3 mr-1" />
                    {linkType}
                  </Badge>

                  {/* CTA Count */}
                  {ctas.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Megaphone className="h-3 w-3 mr-1" />
                      {ctas.length} CTA{ctas.length > 1 ? "s" : ""}
                    </Badge>
                  )}

                  {/* Emoji Count */}
                  {emojis.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {emojis.slice(0, 3).join("")}
                      {emojis.length > 3 && ` +${emojis.length - 3}`}
                    </Badge>
                  )}

                  {/* Bio Length */}
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {(profile.biography || "").length} caracteres
                  </Badge>
                </div>

                {/* External Link */}
                {profile.external_url && (
                  <a
                    href={profile.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <Link2 className="h-3 w-3" />
                    {profile.external_url.replace(/^https?:\/\//, "").slice(0, 40)}
                    {profile.external_url.length > 40 && "..."}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
