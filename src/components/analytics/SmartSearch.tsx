import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Hash, User, FileText, X } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface SmartSearchProps {
  analytics: InstagramAnalyticsItem[];
  accounts: string[];
  onSelectPost?: (post: InstagramAnalyticsItem) => void;
  onSelectAccount?: (account: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

interface SearchResult {
  type: "account" | "post" | "hashtag";
  id: string;
  title: string;
  subtitle?: string;
  data: any;
}

export function SmartSearch({
  analytics,
  accounts,
  onSelectPost,
  onSelectAccount,
  onSelectHashtag,
}: SmartSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Extract unique hashtags
  const allHashtags = useMemo(() => {
    const hashtagMap = new Map<string, number>();
    analytics.forEach(post => {
      (post.hashtags || []).forEach(tag => {
        hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(hashtagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);
  }, [analytics]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return { accounts: [], posts: [], hashtags: [] };

    const q = query.toLowerCase();

    const matchedAccounts = accounts
      .filter(a => a.toLowerCase().includes(q))
      .slice(0, 5);

    const matchedPosts = analytics
      .filter(p => p.caption?.toLowerCase().includes(q))
      .slice(0, 10);

    const matchedHashtags = allHashtags
      .filter(([tag]) => tag.toLowerCase().includes(q))
      .slice(0, 10);

    return {
      accounts: matchedAccounts,
      posts: matchedPosts,
      hashtags: matchedHashtags,
    };
  }, [query, accounts, analytics, allHashtags]);

  const handleSelect = useCallback((type: string, data: any) => {
    setOpen(false);
    setQuery("");
    
    if (type === "account" && onSelectAccount) {
      onSelectAccount(data);
    } else if (type === "post" && onSelectPost) {
      onSelectPost(data);
    } else if (type === "hashtag" && onSelectHashtag) {
      onSelectHashtag(data);
    }
  }, [onSelectAccount, onSelectPost, onSelectHashtag]);

  const hasResults = results.accounts.length > 0 || results.posts.length > 0 || results.hashtags.length > 0;

  return (
    <>
      {/* Search trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 h-9 w-full sm:w-auto justify-start text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Pesquisar...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Pesquisar contas, posts ou hashtags..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!query.trim() && (
            <CommandEmpty className="py-6 text-center text-sm">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Search className="h-8 w-8 opacity-50" />
                <p>Digite para pesquisar</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">@conta</Badge>
                  <Badge variant="secondary">#hashtag</Badge>
                  <Badge variant="secondary">palavra na caption</Badge>
                </div>
              </div>
            </CommandEmpty>
          )}

          {query.trim() && !hasResults && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {/* Accounts */}
          {results.accounts.length > 0 && (
            <CommandGroup heading="Contas">
              {results.accounts.map((acc) => (
                <CommandItem
                  key={acc}
                  value={`account-${acc}`}
                  onSelect={() => handleSelect("account", acc)}
                  className="gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">@{acc}</span>
                    <span className="text-xs text-muted-foreground">
                      {analytics.filter(p => p.owner_username === acc).length} posts
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Hashtags */}
          {results.hashtags.length > 0 && (
            <CommandGroup heading="Hashtags">
              {results.hashtags.map(([tag, count]) => (
                <CommandItem
                  key={tag}
                  value={`hashtag-${tag}`}
                  onSelect={() => handleSelect("hashtag", tag)}
                  className="gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10">
                    <Hash className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">#{tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} posts
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Posts */}
          {results.posts.length > 0 && (
            <CommandGroup heading="Posts">
              {results.posts.map((post) => (
                <CommandItem
                  key={post.id}
                  value={`post-${post.id}`}
                  onSelect={() => handleSelect("post", post)}
                  className="gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">
                      {post.caption?.slice(0, 60) || "Sem legenda"}...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{post.owner_username} · {post.likes_count?.toLocaleString()} likes
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
