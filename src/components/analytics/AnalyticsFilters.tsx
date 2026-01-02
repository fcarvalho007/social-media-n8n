import { Calendar, Filter, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PeriodFilter = "7d" | "30d" | "90d" | "1y" | "all";
export type ContentTypeFilter = "all" | "Image" | "Video" | "Sidecar";

interface AnalyticsFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  account: string;
  onAccountChange: (account: string) => void;
  accounts: string[];
  contentTypes: ContentTypeFilter[];
  onContentTypesChange: (types: ContentTypeFilter[]) => void;
  onReset: () => void;
  totalPosts: number;
  filteredPosts: number;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "1y": "1 ano",
  all: "Tudo",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
};

export function AnalyticsFilters({
  period,
  onPeriodChange,
  account,
  onAccountChange,
  accounts,
  contentTypes,
  onContentTypesChange,
  onReset,
  totalPosts,
  filteredPosts,
}: AnalyticsFiltersProps) {
  const hasActiveFilters =
    period !== "all" || account !== "all" || contentTypes.length < 3;

  const toggleContentType = (type: ContentTypeFilter) => {
    if (type === "all") {
      onContentTypesChange(["Image", "Video", "Sidecar"]);
      return;
    }

    const newTypes = contentTypes.includes(type)
      ? contentTypes.filter((t) => t !== type && t !== "all")
      : [...contentTypes.filter((t) => t !== "all"), type];

    onContentTypesChange(
      newTypes.length === 0 ? ["Image", "Video", "Sidecar"] : newTypes
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account Filter */}
      {accounts.length > 1 && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={account} onValueChange={onAccountChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc} value={acc}>
                  @{acc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Tipo
            {contentTypes.length < 3 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {contentTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="type-all"
                checked={contentTypes.length === 3}
                onCheckedChange={() => toggleContentType("all")}
              />
              <Label htmlFor="type-all" className="text-sm cursor-pointer">
                Todos
              </Label>
            </div>
            {(["Image", "Video", "Sidecar"] as const).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={contentTypes.includes(type)}
                  onCheckedChange={() => toggleContentType(type)}
                />
                <Label
                  htmlFor={`type-${type}`}
                  className="text-sm cursor-pointer"
                >
                  {CONTENT_TYPE_LABELS[type]}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 gap-2 text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}

      {/* Posts count indicator */}
      {filteredPosts !== totalPosts && (
        <Badge variant="outline" className="ml-auto">
          {filteredPosts} de {totalPosts} posts
        </Badge>
      )}
    </div>
  );
}
