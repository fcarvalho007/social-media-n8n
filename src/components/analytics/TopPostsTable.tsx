import { useState } from "react";
import { Heart, MessageCircle, Eye, ExternalLink, ArrowUpDown, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredPosts = posts.filter((post) => {
    if (filterType === "all") return true;
    return post.post_type === filterType;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Posts ({sortedPosts.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v) => { setFilterType(v as FilterType); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Image">Imagem</SelectItem>
              <SelectItem value="Video">Vídeo</SelectItem>
              <SelectItem value="Sidecar">Carrossel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Preview</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("likes")}
                    className="h-8 px-2"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Likes
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("comments")}
                    className="h-8 px-2"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Coment.
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("date")}
                    className="h-8 px-2"
                  >
                    Data
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="w-[60px]">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPosts.map((post, index) => (
                <TableRow key={post.id}>
                  <TableCell>
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm line-clamp-2">
                      {post.caption?.substring(0, 100) || "Sem legenda"}
                      {(post.caption?.length || 0) > 100 && "..."}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {TYPE_LABELS[post.post_type || "Image"] || post.post_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-red-500">
                      <Heart className="h-3 w-3" />
                      {formatNumber(post.likes_count)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-primary">
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
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
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
