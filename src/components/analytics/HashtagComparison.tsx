import { Hash, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface HashtagComparisonProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  limit?: number;
  myAccount?: string;
}

interface HashtagData {
  tag: string;
  accounts: string[];
  totalCount: number;
  avgLikes: number;
}

export function HashtagComparison({
  analytics,
  selectedAccounts,
  accountColorMap,
  limit = 15,
  myAccount,
}: HashtagComparisonProps) {
  // Calculate hashtag usage across accounts
  const hashtagData = (() => {
    const hashtagMap = new Map<string, { accounts: Set<string>; count: number; totalLikes: number }>();

    analytics
      .filter((post) => post.owner_username && selectedAccounts.includes(post.owner_username))
      .forEach((post) => {
        (post.hashtags || []).forEach((tag) => {
          const existing = hashtagMap.get(tag) || { accounts: new Set(), count: 0, totalLikes: 0 };
          existing.accounts.add(post.owner_username!);
          existing.count++;
          existing.totalLikes += post.likes_count || 0;
          hashtagMap.set(tag, existing);
        });
      });

    const result: HashtagData[] = Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        accounts: Array.from(data.accounts),
        totalCount: data.count,
        avgLikes: Math.round(data.totalLikes / data.count),
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, limit);

    return result;
  })();

  // Separate common vs exclusive hashtags
  const commonHashtags = hashtagData.filter((h) => h.accounts.length > 1);
  const exclusiveHashtags = hashtagData.filter((h) => h.accounts.length === 1);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Sort accounts to show myAccount first
  const sortedAccounts = myAccount && selectedAccounts.includes(myAccount)
    ? [myAccount, ...selectedAccounts.filter(a => a !== myAccount)]
    : selectedAccounts;

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Hashtags Comparadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para comparar hashtags
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          Hashtags Comparadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common hashtags */}
        {commonHashtags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <span>🔗 Hashtags em Comum</span>
              <Badge variant="secondary" className="text-xs">
                {commonHashtags.length}
              </Badge>
            </h4>
            <div className="flex flex-wrap gap-2">
              {commonHashtags.map((hashtag) => {
                const hasMyAccount = myAccount && hashtag.accounts.includes(myAccount);
                return (
                  <div
                    key={hashtag.tag}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                      hasMyAccount 
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700" 
                        : "bg-primary/10 border-primary/20"
                    }`}
                  >
                    <span className="text-sm font-medium">#{hashtag.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      ({hashtag.totalCount}x)
                    </span>
                    <div className="flex -space-x-1 ml-1">
                      {hashtag.accounts.slice(0, 3).map((account) => {
                        const colorIndex = accountColorMap.get(account) || 0;
                        const isMyAccountDot = account === myAccount;
                        return (
                          <div
                            key={account}
                            className="w-3 h-3 rounded-full border border-background"
                            style={{ backgroundColor: isMyAccountDot ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex) }}
                            title={`@${account}${isMyAccountDot ? " (você)" : ""}`}
                          />
                        );
                      })}
                      {hashtag.accounts.length > 3 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{hashtag.accounts.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exclusive hashtags per account */}
        {exclusiveHashtags.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">🎯 Hashtags Exclusivas</h4>
            <div className="space-y-3">
              {sortedAccounts.map((username) => {
                const accountHashtags = exclusiveHashtags
                  .filter((h) => h.accounts[0] === username)
                  .slice(0, 5);
                
                if (accountHashtags.length === 0) return null;

                const colorIndex = accountColorMap.get(username) || 0;
                const isMyAccountSection = username === myAccount;
                const color = isMyAccountSection ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex);

                return (
                  <div 
                    key={username} 
                    className={`space-y-1.5 p-2 rounded-lg ${
                      isMyAccountSection ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className={`text-sm font-medium ${isMyAccountSection ? "text-amber-700 dark:text-amber-300" : ""}`}>
                        @{username}
                      </span>
                      {isMyAccountSection && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-4">
                      {accountHashtags.map((hashtag) => (
                        <Badge
                          key={hashtag.tag}
                          variant="outline"
                          className={`text-xs ${isMyAccountSection ? "border-amber-300 dark:border-amber-700" : ""}`}
                        >
                          #{hashtag.tag}
                          <span className="text-muted-foreground ml-1">
                            {hashtag.totalCount}x • {formatNumber(hashtag.avgLikes)} avg
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hashtagData.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem hashtags encontradas nos posts selecionados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
