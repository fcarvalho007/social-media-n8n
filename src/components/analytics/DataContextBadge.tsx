import { Calendar, Clock, User, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface DataContextBadgeProps {
  analytics: InstagramAnalyticsItem[];
}

export function DataContextBadge({ analytics }: DataContextBadgeProps) {
  if (analytics.length === 0) return null;

  // Calculate date range
  const sortedByDate = [...analytics]
    .filter((p) => p.posted_at)
    .sort((a, b) => new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime());

  const oldestPost = sortedByDate[0];
  const newestPost = sortedByDate[sortedByDate.length - 1];

  // Get last import date
  const lastImport = [...analytics].sort(
    (a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
  )[0];

  // Get unique accounts
  const accounts = new Set(analytics.map((p) => p.owner_username).filter(Boolean));

  // Calculate days range
  let daysRange = 0;
  if (oldestPost?.posted_at && newestPost?.posted_at) {
    daysRange = Math.ceil(
      (new Date(newestPost.posted_at).getTime() - new Date(oldestPost.posted_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50 border text-sm">
      {/* Post count */}
      <div className="flex items-center gap-1.5">
        <Database className="h-4 w-4 text-primary" />
        <span className="font-medium">{analytics.length}</span>
        <span className="text-muted-foreground">posts</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Date range */}
      {oldestPost?.posted_at && newestPost?.posted_at && (
        <>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(oldestPost.posted_at), "dd MMM yyyy", { locale: pt })}
              {" → "}
              {format(new Date(newestPost.posted_at), "dd MMM yyyy", { locale: pt })}
            </span>
            <Badge variant="secondary" className="text-xs">
              {daysRange} dias
            </Badge>
          </div>

          <div className="h-4 w-px bg-border" />
        </>
      )}

      {/* Account(s) */}
      {accounts.size > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-muted-foreground" />
            {accounts.size === 1 ? (
              <span className="font-medium">@{Array.from(accounts)[0]}</span>
            ) : (
              <span>
                <span className="font-medium">{accounts.size}</span> contas
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-border" />
        </>
      )}

      {/* Last import */}
      {lastImport && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Última importação:{" "}
            {format(new Date(lastImport.imported_at), "dd MMM yyyy HH:mm", { locale: pt })}
          </span>
        </div>
      )}
    </div>
  );
}
