import { Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getAccountColor } from "@/lib/analytics/colors";

interface AccountSelectorProps {
  accounts: string[];
  selectedAccounts: string[];
  onSelectionChange: (accounts: string[]) => void;
  accountStats?: Map<string, { postCount: number; avgEngagement: number }>;
  maxSelectable?: number;
}

export function AccountSelector({
  accounts,
  selectedAccounts,
  onSelectionChange,
  accountStats,
  maxSelectable = 10,
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {accounts.map((username, index) => {
            const isSelected = selectedAccounts.includes(username);
            const stats = accountStats?.get(username);
            const color = getAccountColor(index);

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
                  {stats && (
                    <p className="text-xs text-muted-foreground">
                      {stats.postCount} posts • {stats.avgEngagement.toLocaleString()} eng médio
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
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
