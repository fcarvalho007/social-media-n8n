import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  Lightbulb,
  Hash,
  Type
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface CaptionAnalysisProps {
  analytics: InstagramAnalyticsItem[];
  contextLabel?: string;
}

// Common Portuguese stop words to filter out
const STOP_WORDS = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com",
  "não", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como",
  "mas", "foi", "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser",
  "quando", "muito", "há", "nos", "já", "está", "eu", "também", "só", "pelo",
  "pela", "até", "isso", "ela", "entre", "era", "depois", "sem", "mesmo",
  "aos", "ter", "seus", "quem", "nas", "me", "esse", "eles", "estão", "você",
  "tinha", "foram", "essa", "num", "nem", "suas", "meu", "às", "minha", "têm",
  "numa", "pelos", "elas", "havia", "seja", "qual", "será", "nós", "tenho",
  "lhe", "deles", "essas", "esses", "pelas", "este", "fosse", "dele", "tu",
  "te", "vocês", "vos", "lhes", "meus", "minhas", "teu", "tua", "teus", "tuas",
  "nosso", "nossa", "nossos", "nossas", "dela", "delas", "esta", "estes",
  "estas", "aquele", "aquela", "aqueles", "aquelas", "isto", "aquilo", "estou",
  "está", "estamos", "estão", "estive", "esteve", "estivemos", "estiveram",
  "the", "to", "and", "of", "is", "in", "it", "you", "that", "was", "for",
  "on", "are", "with", "as", "at", "be", "this", "have", "from", "or", "an",
  "your", "all", "can", "if", "their", "has", "my", "we", "me", "so", "what",
  // Common emoji patterns and symbols
  "👉", "👇", "📲", "💡", "🔥", "✨", "💪", "🎯", "📈", "🚀", "link", "bio"
]);

export function CaptionAnalysis({ analytics, contextLabel }: CaptionAnalysisProps) {
  const { avgLength, wordFrequency, scatterData, insights } = useMemo(() => {
    if (analytics.length === 0) {
      return { avgLength: 0, wordFrequency: [], scatterData: [], insights: [] };
    }

    // Calculate caption lengths
    const lengths = analytics
      .filter(p => p.caption)
      .map(p => ({
        length: p.caption?.length || 0,
        engagement: (p.likes_count || 0) + (p.comments_count || 0),
      }));

    const avgLength = lengths.length > 0
      ? Math.round(lengths.reduce((sum, l) => sum + l.length, 0) / lengths.length)
      : 0;

    // Word frequency analysis
    const wordMap = new Map<string, number>();
    analytics.forEach(post => {
      if (!post.caption) return;
      
      // Clean and split caption
      const words = post.caption
        .toLowerCase()
        .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, ' ')
        .split(/\s+/)
        .filter(word => 
          word.length > 2 && 
          !STOP_WORDS.has(word) &&
          !/^\d+$/.test(word) && // No pure numbers
          !/^#/.test(word) // No hashtags (handled separately)
        );

      words.forEach(word => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
    });

    const wordFrequency = Array.from(wordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Scatter plot data (caption length vs engagement)
    const scatterData = lengths.slice(0, 100); // Limit for performance

    // Calculate correlation and insights
    const insights: string[] = [];
    
    if (lengths.length >= 10) {
      // Group by length buckets
      const shortCaptions = lengths.filter(l => l.length < 150);
      const mediumCaptions = lengths.filter(l => l.length >= 150 && l.length < 500);
      const longCaptions = lengths.filter(l => l.length >= 500);

      const avgEngShort = shortCaptions.length > 0
        ? shortCaptions.reduce((s, l) => s + l.engagement, 0) / shortCaptions.length
        : 0;
      const avgEngMedium = mediumCaptions.length > 0
        ? mediumCaptions.reduce((s, l) => s + l.engagement, 0) / mediumCaptions.length
        : 0;
      const avgEngLong = longCaptions.length > 0
        ? longCaptions.reduce((s, l) => s + l.engagement, 0) / longCaptions.length
        : 0;

      const maxEng = Math.max(avgEngShort, avgEngMedium, avgEngLong);
      
      if (maxEng === avgEngLong && avgEngLong > avgEngShort * 1.1) {
        const improvement = Math.round(((avgEngLong - avgEngShort) / avgEngShort) * 100);
        insights.push(`Captions longas (500+ chars) têm +${improvement}% engagement`);
      } else if (maxEng === avgEngMedium && avgEngMedium > avgEngShort * 1.1) {
        insights.push(`Captions médias (150-500 chars) performam melhor`);
      } else if (maxEng === avgEngShort) {
        insights.push(`Captions curtas (<150 chars) têm bom engagement`);
      }
    }

    if (wordFrequency.length > 0) {
      insights.push(`Palavra mais usada: "${wordFrequency[0].word}" (${wordFrequency[0].count}x)`);
    }

    return { avgLength, wordFrequency, scatterData, insights };
  }, [analytics]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (analytics.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="text-sm">
          <span className="font-medium">{data.length}</span> caracteres
        </p>
        <p className="text-sm text-muted-foreground">
          {formatNumber(data.engagement)} engagement
        </p>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden" id="caption-analysis">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15">
            <FileText className="h-4 w-4 text-emerald-500" />
          </div>
          Análise de Captions
        </CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Comprimento Médio</span>
            </div>
            <p className="text-2xl font-bold">{avgLength}</p>
            <p className="text-xs text-muted-foreground">caracteres</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Posts Analisados</span>
            </div>
            <p className="text-2xl font-bold">{analytics.filter(p => p.caption).length}</p>
            <p className="text-xs text-muted-foreground">com caption</p>
          </div>
        </div>

        {/* Scatter chart - Length vs Engagement */}
        {scatterData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tamanho vs Engagement
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.3} 
                />
                <XAxis 
                  dataKey="length" 
                  name="Caracteres"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Caracteres', position: 'bottom', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  dataKey="engagement" 
                  name="Engagement"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={formatNumber}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter 
                  data={scatterData} 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Word frequency */}
        {wordFrequency.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Palavras Mais Frequentes</h4>
            <div className="flex flex-wrap gap-2">
              {wordFrequency.slice(0, 12).map((item, index) => {
                const opacity = 1 - (index * 0.06);
                return (
                  <Badge 
                    key={item.word}
                    variant="secondary"
                    className="text-xs transition-transform hover:scale-105"
                    style={{ opacity: Math.max(opacity, 0.5) }}
                  >
                    {item.word} ({item.count})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/15">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-sm text-amber-700 dark:text-amber-300 mb-1">
                  Insights
                </p>
                <ul className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
                  {insights.map((insight, i) => (
                    <li key={i}>• {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
