import { Check, Users, Home, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";

interface AccountSelectorProps {
  accounts: string[];
  selectedAccounts: string[];
  onSelectionChange: (accounts: string[]) => void;
  accountStats?: Map<string, { postCount: number; avgEngagement: number }>;
  maxSelectable?: number;
  myAccount?: string;
  onMyAccountChange?: (account: string | null) => void;
}

export function AccountSelector({
  accounts,
  selectedAccounts,
  onSelectionChange,
  accountStats,
  maxSelectable = 10,
  myAccount,
  onMyAccountChange,
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Contas a Comparar</CardTitle>
          </div>
          <Badge variant="secondary">
            {selectedAccounts.length} de {accounts.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Seleccione contas para comparar com a sua conta principal (destacada em dourado ⭐)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* My Account Section */}
        {myAccountData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Home className="h-4 w-4" />
              <span>Minha Conta</span>
            </div>
            <div
              onClick={() => toggleAccount(myAccountData)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedAccounts.includes(myAccountData)
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-amber-300 hover:border-amber-400 hover:bg-amber-50/50 dark:border-amber-700 dark:hover:bg-amber-950/20"
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: MY_ACCOUNT_COLOR }}
              />
              <Checkbox
                checked={selectedAccounts.includes(myAccountData)}
                onCheckedChange={() => toggleAccount(myAccountData)}
                className="pointer-events-none border-amber-500 data-[state=checked]:bg-amber-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">@{myAccountData}</p>
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
                {accountStats?.get(myAccountData) ? (
                  <p className="text-xs text-muted-foreground">
                    {accountStats.get(myAccountData)?.postCount ?? 0} posts • {(accountStats.get(myAccountData)?.avgEngagement ?? 0).toLocaleString()} eng médio
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">A calcular...</p>
                )}
              </div>
              {selectedAccounts.includes(myAccountData) && (
                <Check className="h-4 w-4 text-amber-600 flex-shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Competitors Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Concorrentes</span>
            <Badge variant="outline" className="text-xs">
              {competitorAccounts.length}
            </Badge>
          </div>
          <div className="grid gap-2 max-h-[300px] overflow-y-auto">
            {(myAccount ? competitorAccounts : accounts).map((username, index) => {
              const isSelected = selectedAccounts.includes(username);
              const stats = accountStats?.get(username);
              const color = getColorForAccount(username, index);
              const isCurrentMyAccount = username === myAccount;

              return (
                <div
                  key={username}
                  onClick={() => toggleAccount(username)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleAccount(username)}
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">@{username}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats ? `${stats.postCount} posts • ${stats.avgEngagement.toLocaleString()} eng médio` : "A calcular..."}
                    </p>
                  </div>
                  {onMyAccountChange && !myAccount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => setAsMyAccount(username, e)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-amber-600"
                    >
                      <Home className="h-3 w-3 mr-1" />
                      Definir
                    </Button>
                  )}
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectedAccounts.length === Math.min(accounts.length, maxSelectable)}
            className="flex-1"
          >
            Selecionar Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={selectedAccounts.length === 0}
            className="flex-1"
          >
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
