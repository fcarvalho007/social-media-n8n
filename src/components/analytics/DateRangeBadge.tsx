import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useMemo } from "react";

interface DateRangeBadgeProps {
  analytics: Array<{ posted_at?: string | null }>;
  className?: string;
}

export function DateRangeBadge({ analytics, className = "" }: DateRangeBadgeProps) {
  const dateRange = useMemo(() => {
    if (analytics.length === 0) return null;

    const dates = analytics
      .map(p => p.posted_at ? new Date(p.posted_at) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return null;

    const oldest = dates[0];
    const newest = dates[dates.length - 1];

    return {
      start: format(oldest, "MMM yyyy", { locale: pt }),
      end: format(newest, "MMM yyyy", { locale: pt }),
      isSameMonth: format(oldest, "MMM yyyy") === format(newest, "MMM yyyy"),
    };
  }, [analytics]);

  if (!dateRange) return null;

  return (
    <Badge variant="outline" className={`text-xs font-normal gap-1.5 ${className}`}>
      <Calendar className="h-3 w-3" />
      {dateRange.isSameMonth 
        ? dateRange.start 
        : `${dateRange.start} - ${dateRange.end}`}
    </Badge>
  );
}
