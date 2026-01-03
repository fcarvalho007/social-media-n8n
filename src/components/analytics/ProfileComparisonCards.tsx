import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserCheck, FileText, Link2, BadgeCheck, Building2 } from "lucide-react";
import { InstagramProfile } from "@/hooks/useInstagramProfiles";
import { motion } from "framer-motion";

interface ProfileComparisonCardsProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

const MAIN_ACCOUNT = "frederico.m.carvalho";

export function ProfileComparisonCards({ profiles, mainAccount = MAIN_ACCOUNT }: ProfileComparisonCardsProps) {
  // Sort profiles with main account first
  const sortedProfiles = [...profiles].sort((a, b) => {
    if (a.username === mainAccount) return -1;
    if (b.username === mainAccount) return 1;
    return b.followers_count - a.followers_count;
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getFollowRatio = (followers: number, following: number): string => {
    if (following === 0) return "∞";
    return (followers / following).toFixed(1);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedProfiles.map((profile, index) => {
        const isMain = profile.username === mainAccount;
        
        return (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`relative overflow-hidden h-full hover:shadow-lg transition-shadow ${isMain ? "ring-2 ring-amber-500" : ""}`}>
              {isMain && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
              )}
              
              <CardContent className="p-4 sm:p-5 flex flex-col h-full">
                {/* Header with Avatar and Username */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-border flex-shrink-0">
                    <AvatarImage src={profile.profile_pic_url || undefined} alt={profile.username} />
                    <AvatarFallback className="text-lg">{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-semibold text-sm sm:text-base ${isMain ? "text-amber-600" : ""}`}>
                        @{profile.username}
                      </span>
                      {profile.is_verified && (
                        <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    {profile.full_name && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{profile.full_name}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {isMain && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Principal
                        </Badge>
                      )}
                      {profile.is_business_account && (
                        <Badge variant="outline" className="text-[10px]">
                          <Building2 className="h-2.5 w-2.5 mr-1" />
                          Business
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                    </div>
                    <span className="text-base sm:text-lg font-bold block">{formatNumber(profile.followers_count)}</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Seguidores</p>
                  </div>
                  
                  <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <UserCheck className="h-3 w-3" />
                    </div>
                    <span className="text-base sm:text-lg font-bold block">{formatNumber(profile.follows_count)}</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Seguindo</p>
                  </div>
                  
                  <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <FileText className="h-3 w-3" />
                    </div>
                    <span className="text-base sm:text-lg font-bold block">{formatNumber(profile.posts_count)}</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Posts</p>
                  </div>
                </div>

                {/* Follow Ratio */}
                <div className="flex items-center justify-between p-2 sm:p-3 bg-primary/5 rounded-lg mb-3">
                  <span className="text-xs text-muted-foreground">Rácio Seguidor/Seguindo</span>
                  <Badge variant="secondary" className="font-mono text-xs sm:text-sm">
                    {getFollowRatio(profile.followers_count, profile.follows_count)}:1
                  </Badge>
                </div>

                {/* Bio - flex grow to push link to bottom */}
                <div className="flex-1 mb-3">
                  {profile.biography && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-4">
                      {profile.biography}
                    </p>
                  )}
                </div>

                {/* External Link */}
                {profile.external_url && (
                  <a
                    href={profile.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-auto pt-2 border-t border-border/50"
                  >
                    <Link2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {profile.external_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
