import { Check, Users, Home, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";
import { motion } from "framer-motion";

interface AccountSelectorProps {
  accounts: string[];
  selectedAccounts: string[];
  onSelectionChange: (accounts: string[]) => void;
  accountStats?: Map<string, { postCount: number; avgEngagement: number }>;
  maxSelectable?: number;
  myAccount?: string;
  onMyAccountChange?: (account: string | null) => void;
  profileAvatars?: Map<string, string>;
}

export function AccountSelector({
  accounts,
  selectedAccounts,
  onSelectionChange,
  accountStats,
  maxSelectable = 10,
  myAccount,
  onMyAccountChange,
  profileAvatars,
}: AccountSelectorProps) {
  const toggleAccount = (username: string) => {
    if (selectedAccounts.includes(username)) {
      onSelectionChange(selectedAccounts.filter((a) => a !== username));
    } else if (selectedAccounts.length < maxSelectable) {
      onSelectionChange([...selectedAccounts, username]);
    }
  };

  const selectAll = () => {
    onSelectionChange(accounts.slice(0, maxSelectable));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const setAsMyAccount = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMyAccountChange) {
      onMyAccountChange(myAccount === username ? null : username);
    }
  };

  // Separate my account from competitors
  const myAccountData = myAccount ? accounts.find(a => a === myAccount) : null;
  const competitorAccounts = accounts.filter(a => a !== myAccount);

  // Get color for account (my account gets special golden color)
  const getColorForAccount = (username: string, index: number) => {
    if (username === myAccount) return MY_ACCOUNT_COLOR;
    return getAccountColor(index);
  };

  const getAvatarUrl = (username: string) => {
    return profileAvatars?.get(username) || '';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Contas a Comparar</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">
            {selectedAccounts.length}/{accounts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* My Account Section */}
        {myAccountData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
              <span>Minha Conta</span>
            </div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleAccount(myAccountData)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                selectedAccounts.includes(myAccountData)
                  ? "border-amber-500 bg-gradient-to-r from-amber-500/10 to-orange-500/5 shadow-sm"
                  : "border-amber-300/50 hover:border-amber-400 hover:bg-amber-50/50 dark:border-amber-700/50 dark:hover:bg-amber-950/20"
              }`}
            >
              <Avatar className="h-10 w-10 border-2 border-amber-500/30">
                <AvatarImage src={getAvatarUrl(myAccountData)} alt={myAccountData} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold">
                  {myAccountData.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">@{myAccountData}</p>
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 flex-shrink-0" />
                </div>
                {accountStats?.get(myAccountData) ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>{accountStats.get(myAccountData)?.postCount ?? 0} posts</span>
                    <span className="text-muted-foreground/50">•</span>
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span>{(accountStats.get(myAccountData)?.avgEngagement ?? 0).toLocaleString()}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">A calcular...</p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedAccounts.includes(myAccountData)
                  ? "border-amber-500 bg-amber-500"
                  : "border-muted-foreground/30"
              }`}>
                {selectedAccounts.includes(myAccountData) && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Competitors Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" />
            <span>Concorrentes</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {competitorAccounts.length}
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {(myAccount ? competitorAccounts : accounts).map((username, index) => {
              const isSelected = selectedAccounts.includes(username);
              const stats = accountStats?.get(username);
              const color = getColorForAccount(username, index);

              return (
                <motion.div
                  key={username}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => toggleAccount(username)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={getAvatarUrl(username)} alt={username} />
                      <AvatarFallback 
                        className="text-[10px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">@{username}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {stats ? (
                        <span className="flex items-center gap-1">
                          {stats.postCount} posts
                          <span className="text-muted-foreground/50">•</span>
                          {stats.avgEngagement.toLocaleString()} eng
                        </span>
                      ) : (
                        "A calcular..."
                      )}
                    </p>
                  </div>
                  {onMyAccountChange && !myAccount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => setAsMyAccount(username, e)}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-amber-600"
                    >
                      <Home className="h-3 w-3" />
                    </Button>
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}>
                    {isSelected && (
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectedAccounts.length === Math.min(accounts.length, maxSelectable)}
            className="flex-1 h-8 text-xs"
          >
            Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={selectedAccounts.length === 0}
            className="flex-1 h-8 text-xs"
          >
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
