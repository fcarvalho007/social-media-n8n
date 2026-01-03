import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Building2, ArrowUpDown, ExternalLink } from "lucide-react";
import { InstagramProfile } from "@/hooks/useInstagramProfiles";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ProfilesTableProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

type SortKey = "followers" | "following" | "posts" | "ratio";

const MAIN_ACCOUNT = "frederico.m.carvalho";

export function ProfilesTable({ profiles, mainAccount = MAIN_ACCOUNT }: ProfilesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("followers");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedProfiles = [...profiles].sort((a, b) => {
    let valueA: number, valueB: number;
    
    switch (sortKey) {
      case "followers":
        valueA = a.followers_count;
        valueB = b.followers_count;
        break;
      case "following":
        valueA = a.follows_count;
        valueB = b.follows_count;
        break;
      case "posts":
        valueA = a.posts_count;
        valueB = b.posts_count;
        break;
      case "ratio":
        valueA = a.follows_count > 0 ? a.followers_count / a.follows_count : Infinity;
        valueB = b.follows_count > 0 ? b.followers_count / b.follows_count : Infinity;
        break;
      default:
        valueA = a.followers_count;
        valueB = b.followers_count;
    }
    
    return sortAsc ? valueA - valueB : valueB - valueA;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const SortButton = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent"
      onClick={() => handleSort(sortKeyValue)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyValue ? "text-primary" : "text-muted-foreground"}`} />
      </span>
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tabela Comparativa de Perfis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Conta</TableHead>
                <TableHead className="text-right">
                  <SortButton label="Seguidores" sortKeyValue="followers" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label="Seguindo" sortKeyValue="following" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label="Rácio" sortKeyValue="ratio" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label="Posts" sortKeyValue="posts" />
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProfiles.map((profile, index) => {
                const isMain = profile.username === mainAccount;
                const ratio = profile.follows_count > 0 
                  ? (profile.followers_count / profile.follows_count).toFixed(1) 
                  : "∞";
                
                return (
                  <TableRow 
                    key={profile.id}
                    className={isMain ? "bg-amber-500/5" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-5">
                          #{index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.profile_pic_url || undefined} />
                          <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className={`font-medium text-sm ${isMain ? "text-amber-600" : ""}`}>
                            @{profile.username}
                          </span>
                          {profile.full_name && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {profile.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(profile.followers_count)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(profile.follows_count)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {ratio}:1
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(profile.posts_count)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {profile.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500" aria-label="Verificado" />
                        )}
                        {profile.is_business_account && (
                          <Building2 className="h-4 w-4 text-muted-foreground" aria-label="Business" />
                        )}
                        {!profile.is_verified && !profile.is_business_account && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <a
                        href={`https://instagram.com/${profile.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1 hover:bg-muted rounded"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
