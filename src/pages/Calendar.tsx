import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isToday, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, LayoutGrid, Video, TrendingUp, Filter, Trash2, Maximize2, Minimize2, ImageIcon, Plus, Wand2, PenTool, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const locales = {
  'pt-PT': pt,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(BigCalendar);

interface ScheduledPost {
  id: string;
  tema?: string;
  title?: string;
  scheduled_date?: string;
  due_date?: string;
  content_type: 'carousel' | 'stories' | 'task' | 'milestone';
  status: string;
  template_a_images?: string[];
  story_image_url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string | null;
  project_id?: string;
}

interface CalendarEvent extends Event {
  id: string;
  resource: ScheduledPost;
}

const Calendar = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'stories'>('all');
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>(isMobile ? 'day' : 'month');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwipping, setIsSwipping] = useState(false);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsSwipping(false);
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      const nextDate = new Date(currentMonth);
      if (calendarView === 'day') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (calendarView === 'week') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      setCurrentMonth(nextDate);
    }
    
    if (isRightSwipe) {
      const prevDate = new Date(currentMonth);
      if (calendarView === 'day') {
        prevDate.setDate(prevDate.getDate() - 1);
      } else if (calendarView === 'week') {
        prevDate.setDate(prevDate.getDate() - 7);
      } else {
        prevDate.setMonth(prevDate.getMonth() - 1);
      }
      setCurrentMonth(prevDate);
    }
  };

  // Force mobile-friendly view on small screens
  useEffect(() => {
    if (isMobile && calendarView === 'month') {
      setCalendarView('day');
    }
  }, [isMobile, calendarView]);

  // Add custom CSS for mobile calendar optimization
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .rbc-btn-group button {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
      }

      @media (max-width: 640px) {
        .rbc-day-bg,
        .rbc-time-slot {
          padding: 2px !important;
        }
        
        .rbc-header {
          padding: 8px 4px !important;
          font-size: 12px !important;
        }
        
        .rbc-event {
          padding: 4px 6px !important;
          font-size: 11px !important;
        }

        .rbc-toolbar {
          flex-direction: column !important;
          gap: 12px !important;
          padding: 12px 8px !important;
        }

        .rbc-toolbar-label {
          order: -1;
          width: 100%;
          text-align: center;
          font-size: 18px !important;
          font-weight: bold;
        }
        
        .rbc-today {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        
        .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.02) !important;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const fetchScheduledContent = async () => {
    setLoading(true);
    try {
      const [{ data: posts }, { data: stories }] = await Promise.all([
        supabase
          .from('posts')
          .select('id, tema, content_type, status, scheduled_date, reviewed_at, created_at, published_at, template_a_images')
          .in('status', ['approved', 'published']),
        supabase
          .from('stories')
          .select('id, tema, status, scheduled_date, reviewed_at, created_at, story_image_url')
          .in('status', ['approved', 'published']),
      ]);

      const postEvents: CalendarEvent[] = (posts || []).map((post) => {
        let eventDate: Date;
        if (post.scheduled_date) {
          eventDate = new Date(post.scheduled_date);
        } else if (post.status === 'published' && post.published_at) {
          eventDate = new Date(post.published_at);
        } else {
          eventDate = new Date(post.reviewed_at || post.created_at);
        }
        
        return {
          id: post.id,
          title: post.tema,
          start: eventDate,
          end: eventDate,
          resource: { ...post, content_type: (post.content_type || 'carousel') as 'carousel' | 'stories' },
        };
      });

      const storyEvents: CalendarEvent[] = (stories || []).map((story) => ({
        id: story.id,
        title: story.tema || 'Story',
        start: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        end: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        resource: { ...story, content_type: 'stories' as const },
      }));

      setEvents([...postEvents, ...storyEvents]);
    } catch (error) {
      logger.error('Erro ao carregar conteúdo agendado', error);
      toast.error('Falha ao carregar calendário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledContent();

    const postsChannel = supabase
      .channel('calendar-posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchScheduledContent();
      })
      .subscribe();

    const storiesChannel = supabase
      .channel('calendar-stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        fetchScheduledContent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, []);

  const handleDelete = async (id: string, contentType: string) => {
    try {
      const table: 'posts' | 'stories' = contentType === 'stories' ? 'stories' : 'posts';
      
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      toast.success('Publicação eliminada com sucesso');
      setSelectedEvent(null);
      fetchScheduledContent();
    } catch (error) {
      logger.error('Erro ao eliminar item', error);
      toast.error('Falha ao eliminar item');
    }
  };

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEvent; start: Date }) => {
      try {
        const table: 'posts' | 'stories' = event.resource.content_type === 'stories' ? 'stories' : 'posts';
        
        const { error } = await supabase
          .from(table)
          .update({ scheduled_date: start.toISOString() })
          .eq('id', event.id);

        if (error) throw error;

        toast.success('Data atualizada com sucesso');
        fetchScheduledContent();
      } catch (error) {
        logger.error('Erro ao atualizar data', error);
        toast.error('Falha ao atualizar data');
      }
    },
    []
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    const contentType = event.resource.content_type;
    const isPublished = event.resource.status === 'published';
    const isApproved = event.resource.status === 'approved';
    
    let backgroundColor;
    let border = 'none';
    
    if (isPublished) {
      backgroundColor = '#10B981';
      border = '2px solid #059669';
    } else if (isApproved) {
      backgroundColor = '#F59E0B';
      border = '2px solid #D97706';
    } else {
      backgroundColor = contentType === 'stories' ? '#8B5CF6' : '#3B82F6';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        color: 'white',
        border,
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        padding: '4px 8px',
      },
    };
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    if (filterType === 'posts') {
      return events.filter(e => e.resource.content_type !== 'stories');
    }
    return events.filter(e => e.resource.content_type === 'stories');
  }, [events, filterType]);

  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthEvents = events.filter(e => {
      const eventDate = e.start as Date;
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    const posts = monthEvents.filter(e => e.resource.content_type !== 'stories').length;
    const stories = monthEvents.filter(e => e.resource.content_type === 'stories').length;
    
    return { total: monthEvents.length, posts, stories };
  }, [events, currentMonth]);

  // Custom toolbar for better mobile navigation
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-4 border-b">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          onClick={goToBack}
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px] px-4 lg:px-6 active:scale-95 transition-transform"
        >
          <span className="sm:hidden text-lg">←</span>
          <span className="hidden sm:inline">← Anterior</span>
        </Button>
          <Button
            onClick={goToToday}
            variant="default"
            size="sm"
            className="min-h-[44px] px-6 lg:px-8 active:scale-95 transition-transform font-semibold"
          >
            Hoje
          </Button>
        <Button
          onClick={goToNext}
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px] px-4 lg:px-6 active:scale-95 transition-transform"
        >
          <span className="sm:hidden text-lg">→</span>
          <span className="hidden sm:inline">Próximo →</span>
        </Button>
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {toolbar.label}
          </h2>
        </div>

        {!isMobile && (
          <div className="flex gap-1">
            {['month', 'week', 'day'].map((view) => (
              <Button
                key={view}
                onClick={() => toolbar.onView(view)}
                variant={toolbar.view === view ? 'default' : 'outline'}
                size="sm"
                className="min-h-[44px] px-4 lg:px-6 capitalize active:scale-95 transition-transform"
              >
                {view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const contentType = event.resource.content_type;
    const isPublished = event.resource.status === 'published';
    const isApproved = event.resource.status === 'approved';
    
    let icon;
    if (contentType === 'stories') {
      icon = <Video className="h-3 w-3 flex-shrink-0" />;
    } else if (contentType === 'carousel') {
      icon = <LayoutGrid className="h-3 w-3 flex-shrink-0" />;
    } else {
      icon = <ImageIcon className="h-3 w-3 flex-shrink-0" />;
    }

    // Compact view: icon + title only
    if (viewMode === 'compact') {
      return (
        <div className="flex items-center gap-1 truncate group">
          {icon}
          <span className="text-xs font-semibold truncate">{event.title}</span>
          {isPublished && <span className="ml-1 text-sm font-bold">✓</span>}
          {isApproved && !isPublished && <span className="ml-1 text-xs">⏳</span>}
        </div>
      );
    }
    
    // Normal view: thumbnail + title (or icon for tasks/milestones)
    const thumbnailUrl = contentType === 'stories' 
      ? event.resource.story_image_url 
      : event.resource.template_a_images?.[0];

    return (
      <div className="flex items-start gap-2.5 group">
        <div className="relative flex-shrink-0">
          {thumbnailUrl ? (
            <>
              <img 
                src={thumbnailUrl} 
                alt={String(event.title || '')}
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div 
                className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-lg items-center justify-center"
                style={{ display: 'none' }}
              >
                {icon}
              </div>
            </>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate leading-tight">{event.title}</div>
          <div className="flex items-center gap-1.5 mt-1">
            {icon}
            <span className="text-xs opacity-90">
              {contentType === 'stories' ? 'Story' : contentType === 'carousel' ? 'Carousel' : 'Post'}
            </span>
            {isPublished && <span className="ml-1 text-sm">✓</span>}
            {isApproved && !isPublished && <span className="ml-1 text-xs">⏳</span>}
          </div>
        </div>
      </div>
    );
  };

  const gridEvents = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return events
      .filter(e => {
        const eventDate = e.start as Date;
        return eventDate >= monthStart && eventDate <= monthEnd;
      })
      .sort((a, b) => (b.start as Date).getTime() - (a.start as Date).getTime());
  }, [events, currentMonth]);

  const feedPosts = useMemo(() => 
    gridEvents.filter(e => e.resource.content_type !== 'stories'), 
    [gridEvents]
  );

  const stories = useMemo(() => 
    gridEvents.filter(e => e.resource.content_type === 'stories'), 
    [gridEvents]
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main className="flex-1 p-3 sm:p-4 md:p-4 space-y-3 md:space-y-4 animate-fade-in bg-gradient-to-br from-white to-gray-50">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-[1900px] mx-auto">
              {/* Main Calendar Section */}
              <div className="flex-1 animate-slide-up space-y-4 lg:space-y-5 min-w-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-2 lg:gap-3">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5 lg:gap-3">
                      <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <span className="truncate">Calendário de Conteúdo</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 ml-12 lg:ml-[60px] hidden sm:block">
                      Gerencie publicações agendadas • Arraste para reagendar
                    </p>
                  </div>
                  
                  {/* Create Button + View Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Create Content Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              // Show dropdown or navigate
                              const choice = confirm('Criar conteúdo:\n\nOK = Manual\nCancelar = Com IA');
                              if (choice) {
                                navigate('/manual-create');
                              } else {
                                navigate('/');
                              }
                            }}
                            className="gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-4 active:scale-95 transition-transform bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline font-semibold">Criar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-semibold mb-1">Criar Novo Conteúdo</p>
                          <p className="text-xs text-muted-foreground">
                            Escolha entre criação manual ou com IA
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* View Mode Buttons */}
                    <div className="hidden sm:flex items-center gap-1 ml-2 border-l pl-2">
                      <Button
                        variant={viewMode === 'normal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('normal')}
                        className="gap-1.5 min-h-[44px] px-3 sm:px-4 active:scale-95 transition-transform"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span className="hidden md:inline">Normal</span>
                      </Button>
                      <Button
                        variant={viewMode === 'compact' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('compact')}
                        className="gap-1.5 min-h-[44px] px-3 sm:px-4 active:scale-95 transition-transform"
                      >
                        <Minimize2 className="h-4 w-4" />
                        <span className="hidden md:inline">Compacta</span>
                      </Button>
                    </div>
                  </div>
                </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 xl:gap-5">
                <Card className="p-3 lg:p-3.5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 border-2 hover:shadow-lg hover:shadow-primary/10 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-primary/70">Total</p>
                      <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{monthStats.total}</p>
                    </div>
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/25">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  </div>
                </Card>

                <Card className="p-3 lg:p-3.5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 hover:shadow-lg hover:shadow-blue-200/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-600/70">Posts</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{monthStats.posts}</p>
                    </div>
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-400/30">
                      <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  </div>
                </Card>

                <Card className="p-3 lg:p-3.5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 border-2 hover:shadow-lg hover:shadow-purple-200/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-purple-600/70">Stories</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{monthStats.stories}</p>
                    </div>
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-400/30">
                      <Video className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Legend and Filters */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                {/* Legend */}
                <Card className="p-4 lg:p-5 border-2">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-secondary"></div>
                    Legenda de Cores
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      {/* Status Colors */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="h-4 w-8 rounded border-2 border-green-700" style={{ backgroundColor: '#10B981' }}></div>
                          <span className="text-xs sm:text-sm font-medium text-green-600">✓ Publicado</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="h-4 w-8 rounded border-2 border-orange-700" style={{ backgroundColor: '#F59E0B' }}></div>
                          <span className="text-xs sm:text-sm font-medium text-orange-600">⏳ Aprovado (pendente publicação)</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="h-4 w-8 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                          <span className="text-xs sm:text-sm font-medium text-blue-600">📅 Agendado</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="h-4 w-8 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                          <span className="text-xs sm:text-sm font-medium text-purple-600">📅 Story Agendada</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                        <Video className="h-3 w-3" /> = Story • 
                        <LayoutGrid className="h-3 w-3 ml-1" /> = Carousel
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Filters */}
                <Card className="p-4 lg:p-5 border-2 flex flex-col justify-center">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
                    </div>
                    <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                      <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] touch-target">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="posts">Apenas Posts</SelectItem>
                        <SelectItem value="stories">Apenas Stories</SelectItem>
                        <SelectItem value="tasks">Apenas Tarefas</SelectItem>
                        <SelectItem value="milestones">Apenas Marcos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              </div>

        <div 
          className={`bg-white rounded-xl lg:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 border border-gray-100 overflow-hidden transition-transform ${isSwipping ? 'scale-[0.98]' : ''}`}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchMove={isMobile ? onTouchMove : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
        >
                {loading ? (
                  <div className="h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DnDCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor={(event: CalendarEvent) => event.start as Date}
                    endAccessor={(event: CalendarEvent) => event.end as Date}
          style={{ 
            height: isMobile 
              ? 'calc(100vh - 380px)'
              : window.innerWidth < 1024 
                ? 600 
                : window.innerWidth < 1536
                  ? 700
                  : 800
          }}
                    culture="pt-PT"
                    view={calendarView}
                    onView={(view) => {
                      if (view === 'month' || view === 'week' || view === 'day') {
                        setCalendarView(view);
                      }
                    }}
                    views={isMobile ? ['day'] : ['month', 'week', 'day']}
                    onNavigate={(date) => setCurrentMonth(date)}
                    messages={{
                      next: 'Próximo',
                      previous: 'Anterior',
                      today: 'Hoje',
                      month: 'Mês',
                      week: 'Semana',
                      day: 'Dia',
                      agenda: 'Agenda',
                      date: 'Data',
                      time: 'Hora',
                      event: 'Evento',
                      noEventsInRange: 'Não há eventos neste período.',
                      showMore: (total) => `+ Ver mais (${total})`,
                    }}
                    eventPropGetter={eventStyleGetter}
                    components={{
                      event: ({ event }: any) => <CustomEvent event={event as CalendarEvent} />,
                      toolbar: CustomToolbar,
                    }}
                    onEventDrop={({ event, start }: any) => handleEventDrop({ event: event as CalendarEvent, start })}
                    onSelectEvent={(event: any) => setSelectedEvent(event as CalendarEvent)}
                    popup
                    resizable={false}
                  />
                )}
              </div>
            </div>

            {/* Side Grid Panel - Hidden on mobile/tablet, visible on large screens */}
            <div className="hidden lg:block w-80 2xl:w-96 animate-slide-up space-y-4 flex-shrink-0">
              <Card className="p-5 xl:p-6 border-2 sticky top-4 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col shadow-lg">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    Grid de Conteúdos
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Conteúdos agendados para este mês
                  </p>
                </div>
                
                <div className="overflow-y-auto flex-1 space-y-6 pr-2">
                  {/* Posts Feed */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Posts Feed
                      </h4>
                      <Badge variant="secondary">{feedPosts.length}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:gap-3">
                      {feedPosts.map((event) => {
                        const thumbnailUrl = event.resource.template_a_images?.[0];
                        const isScheduled = !!event.resource.scheduled_date;
                        return (
                          <div
                            key={event.id}
                            className="relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all"
                            onClick={() => setSelectedEvent(event)}
                          >
                             {thumbnailUrl ? (
                              <img 
                                src={thumbnailUrl} 
                                alt={String(event.title || '')}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder on image load error
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerHTML = `
                                      <div class="w-full h-full bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-2">
                                        <svg class="h-5 w-5 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span class="text-[9px] text-red-600 font-medium text-center">Imagem não disponível</span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-2 gap-1">
                                <LayoutGrid className="h-5 w-5 text-gray-400" />
                                <span className="text-[9px] text-gray-500 font-medium text-center">Sem imagem</span>
                              </div>
                            )}
                            {isScheduled && (
                              <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-1 shadow-md">
                                <Clock className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {feedPosts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum post agendado</p>
                    )}
                  </div>

                  {/* Stories */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Stories Instagram
                      </h4>
                      <Badge variant="secondary">{stories.length}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {stories.map((event) => {
                        const thumbnailUrl = event.resource.story_image_url;
                        const isScheduled = !!event.resource.scheduled_date;
                        return (
                          <div
                            key={event.id}
                            className="relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all"
                            onClick={() => setSelectedEvent(event)}
                          >
                             {thumbnailUrl ? (
                              <img 
                                src={thumbnailUrl} 
                                alt={String(event.title || '')}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder on image load error
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerHTML = `
                                      <div class="w-full h-full bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-2">
                                        <svg class="h-5 w-5 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span class="text-[9px] text-red-600 font-medium text-center">Imagem não disponível</span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex flex-col items-center justify-center p-2 gap-1">
                                <Video className="h-5 w-5 text-purple-400" />
                                <span className="text-[9px] text-purple-600 font-medium text-center">Sem imagem</span>
                              </div>
                            )}
                            {isScheduled && (
                              <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-1 shadow-md">
                                <Clock className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {stories.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhuma story agendada</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedEvent?.resource.content_type === 'stories' ? (
                <Video className="h-5 w-5 text-[#8B5CF6]" />
              ) : (
                <LayoutGrid className="h-5 w-5 text-[#4169A0]" />
              )}
              Detalhes da Publicação
            </DialogTitle>
            {selectedEvent && (
              <DialogDescription>
                {selectedEvent.resource.scheduled_date 
                  ? `Agendada para ${format(selectedEvent.start as Date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`
                  : selectedEvent.resource.status === 'published' 
                    ? `Publicada em ${format(selectedEvent.start as Date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`
                    : `Aprovada em ${format(selectedEvent.start as Date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}`
                }
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-5">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                  {selectedEvent.resource.status === 'published' && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Publicada
                    </Badge>
                  )}
                  {selectedEvent.resource.scheduled_date && selectedEvent.resource.status === 'approved' && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Agendada
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={selectedEvent.resource.content_type === 'stories' ? 'default' : 'secondary'} className="flex items-center gap-1.5">
                    {selectedEvent.resource.content_type === 'stories' ? (
                      <>
                        <Video className="h-3 w-3" />
                        Story
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="h-3 w-3" />
                        Post
                      </>
                    )}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(selectedEvent.start as Date, "HH:mm", { locale: pt })}
                  </div>
                </div>
              </div>

              {selectedEvent.resource.template_a_images?.[0] && (
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow">
                  <img
                    src={selectedEvent.resource.template_a_images[0]}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {selectedEvent.resource.story_image_url && (
                <div className="relative aspect-[9/16] max-h-96 rounded-xl overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow mx-auto">
                  <img
                    src={selectedEvent.resource.story_image_url}
                    alt="Story Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    if (confirm('Tem a certeza que deseja eliminar esta publicação?')) {
                      handleDelete(selectedEvent.id, selectedEvent.resource.content_type);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedEvent(null)}
                >
                  Fechar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    const path =
                      selectedEvent.resource.content_type === 'stories'
                        ? `/review-story/${selectedEvent.id}`
                        : `/review/${selectedEvent.id}`;
                    navigate(path);
                    setSelectedEvent(null);
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Calendar;
