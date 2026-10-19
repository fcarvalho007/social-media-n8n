import { useEffect, useState } from 'react';
import { LayoutDashboard, User, PieChart, TrendingUp, Trophy, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'dashboard-header', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'kpi-cards', label: 'Indicadores', icon: TrendingUp },
  { id: 'profile-overview', label: 'Perfil', icon: User },
  { id: 'content-analysis', label: 'Conteúdo', icon: PieChart },
  { id: 'engagement-chart', label: 'Interações', icon: TrendingUp },
  { id: 'top-posts', label: 'Melhores publicações', icon: Trophy },
  { id: 'best-times', label: 'Horários', icon: Clock },
  { id: 'caption-analysis', label: 'Legendas', icon: FileText },
];

/** In-page destinations, rather than a second application sidebar. */
export function AnalyticsSidebar({ className, perfilVisivel = false }: { className?: string; perfilVisivel?: boolean }) {
  const [active, setActive] = useState('dashboard-header');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const first = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (first) setActive(first.target.id);
    }, { rootMargin: '-100px 0px -55% 0px' });
    sections.filter(s => s.id !== 'profile-overview' || perfilVisivel).forEach(s => { const node = document.getElementById(s.id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [perfilVisivel]);
  return <nav aria-label="Secções dos resultados" className={cn('flex min-w-0 gap-1 overflow-x-auto rounded-lg border bg-card p-1', className)}>
    {sections.filter(s => s.id !== 'profile-overview' || perfilVisivel).map(s => <Button key={s.id} variant="ghost" className={cn('min-h-11 shrink-0 text-xs', active === s.id && 'bg-accent text-primary')} aria-current={active === s.id ? 'location' : undefined} onClick={() => {
      const node = document.getElementById(s.id);
      if (node) { node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setActive(s.id); }
    }}><s.icon data-icon="inline-start" aria-hidden />{s.label}</Button>)}
  </nav>;
}
