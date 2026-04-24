import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Download, Lightbulb } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { AccountInsight } from '@/types/aiEditorial';

const categories = ['todas', 'conteúdo', 'timing', 'formato', 'tom'];
const networks = ['todas', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok'];

export default function Insights() {
  const { user } = useAuth();
  const [network, setNetwork] = useState('todas');
  const [category, setCategory] = useState('todas');
  const [period, setPeriod] = useState('90');

  const { data, isLoading } = useQuery({
    queryKey: ['account-insights', user?.id, network, category, period],
    enabled: !!user?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: insights }, { count }] = await Promise.all([
        supabase.from('account_insights' as any).select('*').eq('user_id', user!.id).eq('never_show', false).gte('last_updated', since).order('confidence', { ascending: false }),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'published').not('performance_classification', 'is', null).gte('published_at', since),
      ]);
      return { insights: (insights ?? []) as unknown as AccountInsight[], classifiedCount: count ?? 0 };
    },
  });

  const filtered = useMemo(() => (data?.insights ?? []).filter((insight) => {
    if (network !== 'todas' && insight.network !== network) return false;
    if (category !== 'todas' && insight.format !== category && insight.metadata?.category !== category) return false;
    return true;
  }), [category, data?.insights, network]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de insights', 14, 20);
    doc.setFontSize(10);
    doc.text(`Base: ${data?.classifiedCount ?? 0} publicações · Período: ${period} dias`, 14, 28);
    let y = 42;
    filtered.forEach((insight, index) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${insight.finding}`, 14, y, { maxWidth: 180 });
      y += 12;
      doc.setFontSize(9);
      doc.text(`Amostra: ${insight.sample_size} · Confiança: ${Math.round((insight.confidence || 0) * 100)}% · Rede: ${insight.network || 'todas'}`, 14, y);
      y += 12;
    });
    doc.save('relatorio-insights.pdf');
  };

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal"><Lightbulb className="h-6 w-6 text-primary" />Os teus insights</h1>
          <p className="text-sm text-muted-foreground">Baseados em {data?.classifiedCount ?? 0} publicações dos últimos {period} dias.</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={exportPdf} disabled={!filtered.length}><Download className="h-4 w-4" />Exportar relatório PDF</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={network} onValueChange={setNetwork}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{networks.map(item => <SelectItem key={item} value={item}>{item === 'todas' ? 'Todas as redes' : item}</SelectItem>)}</SelectContent></Select>
        <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(item => <SelectItem key={item} value={item}>{item === 'todas' ? 'Todas as categorias' : item}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30 dias</SelectItem><SelectItem value="60">60 dias</SelectItem><SelectItem value="90">90 dias</SelectItem></SelectContent></Select>
      </div>

      {(data?.classifiedCount ?? 0) < 30 ? (
        <Card><CardHeader><CardTitle>Estamos a aprender sobre o teu conteúdo.</CardTitle><CardDescription>Vais começar a ver insights quando tiveres 30 posts publicados. Atualmente: {data?.classifiedCount ?? 0}/30.</CardDescription></CardHeader></Card>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar insights...</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((insight) => {
            const chart = Array.isArray(insight.metadata?.chart) ? insight.metadata.chart as Array<{ label: string; value: number }> : [];
            return (
              <Card key={insight.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{String(insight.metadata?.category || insight.format || 'conteúdo')}</Badge>{insight.network && <Badge variant="outline">{insight.network}</Badge>}</div>
                  <CardTitle className="text-base">{insight.finding}</CardTitle>
                  <CardDescription>Amostra: {insight.sample_size} posts · Confiança: {Math.round((insight.confidence || 0) * 100)}%</CardDescription>
                </CardHeader>
                {chart.length > 0 && <CardContent><div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
