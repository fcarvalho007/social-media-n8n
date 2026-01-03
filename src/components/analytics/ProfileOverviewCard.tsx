import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BadgeCheck, 
  Users, 
  UserPlus, 
  Grid3X3, 
  ExternalLink,
  Building2
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import type { InstagramProfile } from "@/hooks/useInstagramProfiles";

interface ProfileOverviewCardProps {
  profile: InstagramProfile | null;
  historicalProfiles?: InstagramProfile[];
}

export function ProfileOverviewCard({ profile, historicalProfiles = [] }: ProfileOverviewCardProps) {
  // Calculate sparkline data from historical profiles
  const sparklineData = useMemo(() => {
    if (historicalProfiles.length < 2) return [];
    
    return historicalProfiles
      .sort((a, b) => new Date(a.scraped_at || 0).getTime() - new Date(b.scraped_at || 0).getTime())
      .map(p => ({
        date: p.scraped_at,
        followers: p.followers_count || 0,
      }));
  }, [historicalProfiles]);

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Selecione uma conta para ver os detalhes do perfil
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { 
      label: "Seguidores", 
      value: formatNumber(profile.followers_count),
      icon: Users,
      color: "text-blue-500"
    },
    { 
      label: "Seguindo", 
      value: formatNumber(profile.follows_count),
      icon: UserPlus,
      color: "text-emerald-500"
    },
    { 
      label: "Posts", 
      value: formatNumber(profile.posts_count),
      icon: Grid3X3,
      color: "text-violet-500"
    },
  ];

  return (
    <Card className="overflow-hidden" id="profile-overview">
      <CardContent className="p-0">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        </div>

        {/* Profile info section */}
        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Avatar */}
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
              <AvatarImage 
                src={profile.profile_pic_url_hd || profile.profile_pic_url || ""} 
                alt={profile.username}
              />
              <AvatarFallback className="text-2xl font-bold bg-primary/10">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name and username */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold truncate">
                  {profile.full_name || profile.username}
                </h3>
                {profile.is_verified && (
                  <BadgeCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                {profile.is_business_account && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" />
                    Business
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">@{profile.username}</p>
              
              {profile.business_category && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {profile.business_category}
                </Badge>
              )}
            </div>

            {/* Sparkline (if historical data) */}
            {sparklineData.length >= 2 && (
              <div className="w-24 h-12 hidden sm:block">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground text-center">Crescimento</p>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.biography && (
            <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
              {profile.biography}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                className="text-center p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* External link */}
          {profile.external_url && (
            <a
              href={profile.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="truncate">{profile.external_url.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
