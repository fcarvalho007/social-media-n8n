import { useState, useMemo } from "react";
import { Heart, MessageCircle, ExternalLink, ArrowUpDown, ImageOff, Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface TopPostsTableProps {
  posts: InstagramAnalyticsItem[];
}

type SortKey = "likes" | "comments" | "engagement" | "date" | "views";
type FilterType = "all" | "Image" | "Video" | "Sidecar";

export function TopPostsTable({ posts }: TopPostsTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("engagement");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const perPage = 15;

  // Filter by type and search
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesType = filterType === "all" || post.post_type === filterType;
      const matchesSearch = searchQuery === "" || 
        post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.hashtags?.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [posts, filterType, searchQuery]);

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "likes":
          aVal = a.likes_count;
          bVal = b.likes_count;
          break;
        case "comments":
          aVal = a.comments_count;
          bVal = b.comments_count;
          break;
        case "views":
          aVal = a.views_count;
          bVal = b.views_count;
          break;
        case "date":
          aVal = new Date(a.posted_at || 0).getTime();
          bVal = new Date(b.posted_at || 0).getTime();
          break;
        case "engagement":
        default:
          aVal = a.likes_count + a.comments_count;
          bVal = b.likes_count + b.comments_count;
      }
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [filteredPosts, sortBy, sortOrder]);

  const paginatedPosts = sortedPosts.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(sortedPosts.length / perPage);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const TYPE_LABELS: Record<string, string> = {
    Image: "Imagem",
    Video: "Vídeo",
    Sidecar: "Carrossel",
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Likes", "Comentários", "Views", "Engagement", "Caption", "URL"];
    const rows = sortedPosts.map(post => [
      post.posted_at ? format(new Date(post.posted_at), "yyyy-MM-dd") : "",
      TYPE_LABELS[post.post_type || "Image"] || post.post_type,
      post.likes_count,
      post.comments_count,
      post.views_count,
      post.likes_count + post.comments_count,
      `"${(post.caption || "").replace(/"/g, '""').substring(0, 200)}"`,
      post.post_url
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `instagram-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-lg">Posts ({sortedPosts.length})</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar caption..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-8 w-[180px]"
            />
          </div>

          {/* Type filter */}
          <Select value={filterType} onValueChange={(v) => { setFilterType(v as FilterType); setPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Image">Imagem</SelectItem>
              <SelectItem value="Video">Vídeo</SelectItem>
              <SelectItem value="Sidecar">Carrossel</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Imagem</TableHead>
                <TableHead className="min-w-[200px]">Caption</TableHead>
                <TableHead className="w-[90px]">Tipo</TableHead>
                <TableHead className="w-[90px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("likes")}
                    className={`h-8 px-2 ${sortBy === "likes" ? "text-primary" : ""}`}
                  >
                    <Heart className="h-3.5 w-3.5 mr-1" />
                    Likes
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("comments")}
                    className={`h-8 px-2 ${sortBy === "comments" ? "text-primary" : ""}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Coment.
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[90px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("date")}
                    className={`h-8 px-2 ${sortBy === "date" ? "text-primary" : ""}`}
                  >
                    Data
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Nenhum post encontrado" : "Sem posts para mostrar"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.thumbnail_url && !imageErrors.has(post.id) ? (
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-10 h-10 object-cover rounded"
                          onError={() => setImageErrors(prev => new Set(prev).add(post.id))}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm line-clamp-2">
                        {post.caption?.substring(0, 120) || "Sem legenda"}
                        {(post.caption?.length || 0) > 120 && "..."}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABELS[post.post_type || "Image"] || post.post_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <Heart className="h-3 w-3" />
                        {formatNumber(post.likes_count)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(post.comments_count)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {post.posted_at
                        ? format(new Date(post.posted_at), "dd MMM yy", { locale: pt })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} ({sortedPosts.length} posts)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
