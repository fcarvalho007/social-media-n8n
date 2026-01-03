import { useMemo } from "react";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

export interface ContentInsight {
  id: string;
  title: string;
  description: string;
  impact: number; // percentage impact
  type: "positive" | "negative" | "neutral";
  category: "emoji" | "caption" | "timing" | "hashtag" | "content";
  icon: string;
}

export function useContentPatterns(analytics: InstagramAnalyticsItem[]) {
  const insights = useMemo(() => {
    if (analytics.length < 10) return [];

    const results: ContentInsight[] = [];
    const avgEngagement = analytics.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0) / analytics.length;

    // 1. Emoji at start analysis
    const withEmojiStart = analytics.filter(p => {
      const caption = p.caption || "";
      const firstChar = caption.trim().charAt(0);
      return /[\u{1F300}-\u{1F9FF}]/u.test(firstChar);
    });
    const withoutEmojiStart = analytics.filter(p => {
      const caption = p.caption || "";
      const firstChar = caption.trim().charAt(0);
      return !/[\u{1F300}-\u{1F9FF}]/u.test(firstChar);
    });

    if (withEmojiStart.length >= 5 && withoutEmojiStart.length >= 5) {
      const avgWithEmoji = withEmojiStart.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0) / withEmojiStart.length;
      const avgWithoutEmoji = withoutEmojiStart.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0) / withoutEmojiStart.length;
      const impact = Math.round(((avgWithEmoji - avgWithoutEmoji) / avgWithoutEmoji) * 100);

      if (Math.abs(impact) >= 5) {
        results.push({
          id: "emoji-start",
          title: impact > 0 ? "Emojis no início funcionam!" : "Emojis no início têm menos impacto",
          description: impact > 0
            ? `Posts que começam com emoji têm +${impact}% engagement`
            : `Posts sem emoji no início têm ${Math.abs(impact)}% mais engagement`,
          impact: Math.abs(impact),
          type: impact > 0 ? "positive" : "neutral",
          category: "emoji",
          icon: "😊",
        });
      }
    }

    // 2. Caption length analysis
    const shortCaptions = analytics.filter(p => (p.caption?.length || 0) < 100);
    const mediumCaptions = analytics.filter(p => {
      const len = p.caption?.length || 0;
      return len >= 100 && len <= 300;
    });
    const longCaptions = analytics.filter(p => (p.caption?.length || 0) > 300);

    const groups = [
      { name: "curtas (<100)", posts: shortCaptions },
      { name: "médias (100-300)", posts: mediumCaptions },
      { name: "longas (>300)", posts: longCaptions },
    ].filter(g => g.posts.length >= 5);

    if (groups.length >= 2) {
      const avgByGroup = groups.map(g => ({
        ...g,
        avg: g.posts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0) / g.posts.length,
      }));
      
      const best = avgByGroup.reduce((a, b) => a.avg > b.avg ? a : b);
      const worst = avgByGroup.reduce((a, b) => a.avg < b.avg ? a : b);
      const impact = Math.round(((best.avg - worst.avg) / worst.avg) * 100);

      if (impact >= 10) {
        results.push({
          id: "caption-length",
          title: `Legendas ${best.name} performam melhor`,
          description: `Legendas ${best.name} têm +${impact}% engagement vs ${worst.name}`,
          impact,
          type: "positive",
          category: "caption",
          icon: "📝",
        });
      }
    }

    // 3. Best day of week
    const dayStats = new Map<number, { total: number; count: number }>();
    analytics.forEach(p => {
      if (!p.posted_at) return;
      const day = new Date(p.posted_at).getDay();
      const existing = dayStats.get(day) || { total: 0, count: 0 };
      dayStats.set(day, {
        total: existing.total + (p.likes_count || 0) + (p.comments_count || 0),
        count: existing.count + 1,
      });
    });

    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const dayAvgs = Array.from(dayStats.entries())
      .filter(([_, v]) => v.count >= 3)
      .map(([day, v]) => ({ day, avg: v.total / v.count, count: v.count }));

    if (dayAvgs.length >= 3) {
      const bestDay = dayAvgs.reduce((a, b) => a.avg > b.avg ? a : b);
      const worstDay = dayAvgs.reduce((a, b) => a.avg < b.avg ? a : b);
      const impact = Math.round(((bestDay.avg - avgEngagement) / avgEngagement) * 100);

      if (impact >= 5) {
        results.push({
          id: "best-day",
          title: `${dayNames[bestDay.day]} é o melhor dia`,
          description: `Posts de ${dayNames[bestDay.day]} têm +${impact}% engagement vs média`,
          impact,
          type: "positive",
          category: "timing",
          icon: "📅",
        });
      }
    }

    // 4. Content type analysis
    const typeStats = new Map<string, { total: number; count: number }>();
    analytics.forEach(p => {
      const type = p.post_type || "Image";
      const existing = typeStats.get(type) || { total: 0, count: 0 };
      typeStats.set(type, {
        total: existing.total + (p.likes_count || 0) + (p.comments_count || 0),
        count: existing.count + 1,
      });
    });

    const typeLabels: Record<string, string> = {
      Video: "Vídeos",
      Sidecar: "Carrosséis",
      Image: "Imagens",
    };

    const typeAvgs = Array.from(typeStats.entries())
      .filter(([_, v]) => v.count >= 5)
      .map(([type, v]) => ({ type, avg: v.total / v.count, count: v.count }));

    if (typeAvgs.length >= 2) {
      const bestType = typeAvgs.reduce((a, b) => a.avg > b.avg ? a : b);
      const impact = Math.round(((bestType.avg - avgEngagement) / avgEngagement) * 100);

      if (impact >= 10) {
        results.push({
          id: "best-type",
          title: `${typeLabels[bestType.type] || bestType.type} geram mais engagement`,
          description: `${typeLabels[bestType.type]} têm +${impact}% engagement vs média`,
          impact,
          type: "positive",
          category: "content",
          icon: bestType.type === "Video" ? "🎬" : bestType.type === "Sidecar" ? "📚" : "📷",
        });
      }
    }

    // 5. Hashtag count analysis
    const lowHashtags = analytics.filter(p => (p.hashtags?.length || 0) <= 5);
    const medHashtags = analytics.filter(p => {
      const len = p.hashtags?.length || 0;
      return len > 5 && len <= 15;
    });
    const highHashtags = analytics.filter(p => (p.hashtags?.length || 0) > 15);

    const hashtagGroups = [
      { name: "poucas (≤5)", posts: lowHashtags },
      { name: "moderadas (6-15)", posts: medHashtags },
      { name: "muitas (>15)", posts: highHashtags },
    ].filter(g => g.posts.length >= 5);

    if (hashtagGroups.length >= 2) {
      const avgByGroup = hashtagGroups.map(g => ({
        ...g,
        avg: g.posts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0) / g.posts.length,
      }));
      
      const best = avgByGroup.reduce((a, b) => a.avg > b.avg ? a : b);
      const impact = Math.round(((best.avg - avgEngagement) / avgEngagement) * 100);

      if (Math.abs(impact) >= 5) {
        results.push({
          id: "hashtag-count",
          title: `Hashtags ${best.name} funcionam melhor`,
          description: `Posts com hashtags ${best.name} têm +${impact}% engagement`,
          impact: Math.abs(impact),
          type: "positive",
          category: "hashtag",
          icon: "#️⃣",
        });
      }
    }

    // Sort by impact
    return results.sort((a, b) => b.impact - a.impact);
  }, [analytics]);

  return { insights };
}
