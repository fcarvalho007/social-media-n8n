import { Search, List, LayoutGrid, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DraftsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
  availablePlatforms: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const platformLabels: Record<string, string> = {
  'instagram-carousel': 'Instagram Carrossel',
  'instagram-stories': 'Instagram Stories',
  'instagram-reels': 'Instagram Reels',
  'linkedin': 'LinkedIn',
  'linkedin-document': 'LinkedIn Documento',
};

export function DraftsFilters({
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortByChange,
  view,
  onViewChange,
  availablePlatforms,
  hasActiveFilters,
  onClearFilters,
}: DraftsFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar rascunhos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Platform Filter */}
        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {availablePlatforms.map((p) => (
              <SelectItem key={p} value={p}>
                {platformLabels[p] || p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as datas</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="older">Mais antigos</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3",
              view === 'list' && "bg-background shadow-sm"
            )}
            onClick={() => onViewChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3",
              view === 'grid' && "bg-background shadow-sm"
            )}
            onClick={() => onViewChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sort and Clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar:</span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
              <SelectItem value="platform-asc">Plataforma A-Z</SelectItem>
              <SelectItem value="platform-desc">Plataforma Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
