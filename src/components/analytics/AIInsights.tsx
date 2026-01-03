import { Sparkles, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContentPatterns, type ContentInsight } from "@/hooks/useContentPatterns";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import { motion } from "framer-motion";

interface AIInsightsProps {
  analytics: InstagramAnalyticsItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  emoji: "bg-amber-500/10 text-amber-600 border-amber-200",
  caption: "bg-blue-500/10 text-blue-600 border-blue-200",
  timing: "bg-violet-500/10 text-violet-600 border-violet-200",
  hashtag: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  content: "bg-rose-500/10 text-rose-600 border-rose-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  emoji: "Emojis",
  caption: "Legendas",
  timing: "Timing",
  hashtag: "Hashtags",
  content: "Conteúdo",
};

export function AIInsights({ analytics }: AIInsightsProps) {
  const { insights } = useContentPatterns(analytics);

  if (insights.length === 0) {
    return (
      <Card id="ai-insights" className="card-premium">
        <CardHeader className="card-premium-header">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Importe mais dados para gerar insights automáticos
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Mínimo de 10 posts necessários
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ai-insights" className="card-premium">
      <CardHeader className="card-premium-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            Insights Automáticos
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {insights.length} descobertas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight, index }: { insight: ContentInsight; index: number }) {
  const ImpactIcon = insight.type === "positive" 
    ? TrendingUp 
    : insight.type === "negative" 
    ? TrendingDown 
    : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-xl border ${CATEGORY_COLORS[insight.category]} transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{insight.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {CATEGORY_LABELS[insight.category]}
            </Badge>
            <div className="flex items-center gap-1 text-xs">
              <ImpactIcon className={`h-3 w-3 ${
                insight.type === "positive" ? "text-emerald-500" :
                insight.type === "negative" ? "text-rose-500" :
                "text-muted-foreground"
              }`} />
              <span className={`font-semibold ${
                insight.type === "positive" ? "text-emerald-600" :
                insight.type === "negative" ? "text-rose-600" :
                "text-muted-foreground"
              }`}>
                {insight.impact > 0 ? "+" : ""}{insight.impact}%
              </span>
            </div>
          </div>
          <h4 className="font-semibold text-sm leading-tight mb-1">
            {insight.title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
