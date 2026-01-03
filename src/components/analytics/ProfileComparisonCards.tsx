import { ExternalLink, Users, UserPlus, FileText, BadgeCheck, Briefcase, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InstagramProfile } from "@/hooks/useInstagramProfiles";

const MAIN_ACCOUNT = "frederico.m.carvalho";

interface ProfileComparisonCardsProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

// Generate a gradient based on username hash
const getGradientForUsername = (username: string, isMain: boolean) => {
  if (isMain) {
    return "from-amber-500/30 via-orange-500/20 to-yellow-500/30";
  }
  
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-blue-500/20 via-indigo-500/15 to-purple-500/20",
    "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
    "from-rose-500/20 via-pink-500/15 to-fuchsia-500/20",
    "from-violet-500/20 via-purple-500/15 to-indigo-500/20",
    "from-sky-500/20 via-blue-500/15 to-indigo-500/20",
    "from-orange-500/20 via-amber-500/15 to-yellow-500/20",
    "from-teal-500/20 via-emerald-500/15 to-green-500/20",
  ];
  
  return gradients[hash % gradients.length];
};

export function ProfileComparisonCards({ profiles, mainAccount = MAIN_ACCOUNT }: ProfileComparisonCardsProps) {
  // Sort profiles: main account first, then by followers
  const sortedProfiles = [...profiles].sort((a, b) => {
    if (a.username === mainAccount) return -1;
    if (b.username === mainAccount) return 1;
    return (b.followers_count || 0) - (a.followers_count || 0);
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getFollowRatio = (followers: number, following: number): { ratio: string; isGood: boolean } => {
    if (following === 0) return { ratio: "∞", isGood: true };
    const ratio = followers / following;
    return { 
      ratio: ratio.toFixed(1), 
      isGood: ratio >= 1 
    };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedProfiles.map((profile, index) => {
        const isMain = profile.username === mainAccount;
        const { ratio, isGood } = getFollowRatio(profile.followers_count || 0, profile.follows_count || 0);
        const gradient = getGradientForUsername(profile.username, isMain);

        return (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300 group ${
              isMain ? "ring-2 ring-amber-500/50" : ""
            }`}
          >
            {/* Gradient Header */}
            <div className={`h-20 bg-gradient-to-br ${gradient} relative`}>
              {isMain && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-amber-500 text-white border-0 shadow-lg">
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    Principal
                  </Badge>
                </div>
              )}
            </div>

            {/* Avatar - overlapping header */}
            <div className="relative px-4">
              <div className="-mt-10 relative z-10">
                <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                  <AvatarImage 
                    src={profile.profile_pic_url_hd || profile.profile_pic_url || ''} 
                    alt={profile.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Profile Info */}
            <div className="px-4 pt-3 pb-4 space-y-3">
              {/* Username & Name */}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-foreground">@{profile.username}</span>
                  {profile.is_verified && (
                    <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                  )}
                </div>
                {profile.full_name && (
                  <p className="text-sm text-muted-foreground truncate">{profile.full_name}</p>
                )}
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {profile.is_business_account && (
                    <Badge variant="secondary" className="text-xs h-5 gap-1">
                      <Briefcase className="h-3 w-3" />
                      Negócio
                    </Badge>
                  )}
                  {profile.business_category && (
                    <Badge variant="outline" className="text-xs h-5 truncate max-w-[120px]">
                      {profile.business_category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-lg">{formatNumber(profile.followers_count || 0)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Seguidores</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-lg">{formatNumber(profile.follows_count || 0)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Seguindo</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-lg">{formatNumber(profile.posts_count || 0)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posts</p>
                </div>
              </div>

              {/* Ratio Highlight */}
              <div className={`flex items-center justify-between p-2.5 rounded-lg ${
                isGood ? "bg-emerald-500/10" : "bg-orange-500/10"
              }`}>
                <span className="text-xs text-muted-foreground">Rácio Seguidor/Seguindo</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className={`h-3.5 w-3.5 ${isGood ? "text-emerald-500" : "text-orange-500"}`} />
                  <span className={`font-bold ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {ratio}:1
                  </span>
                </div>
              </div>

              {/* Bio */}
              {profile.biography && (
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {profile.biography}
                </p>
              )}

              {/* External Link & View Profile */}
              <div className="flex items-center justify-between pt-1">
                {profile.external_url ? (
                  <a 
                    href={profile.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-[140px] flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    {profile.external_url.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                ) : (
                  <span />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 hover:bg-primary/10"
                  asChild
                >
                  <a 
                    href={`https://instagram.com/${profile.username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Ver Perfil
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
