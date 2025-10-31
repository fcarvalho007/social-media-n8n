import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isToday, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, LayoutGrid, Video, TrendingUp, Filter, Trash2, Maximize2, Minimize2, ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  tema: string;
  scheduled_date: string;
  content_type: string;
  status: string;
  template_a_images?: string[];
  story_image_url?: string;
}

interface CalendarEvent extends Event {
  id: string;
  resource: ScheduledPost;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'stories'>('all');
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');

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
        // Prioridade de datas: scheduled_date > published_at > reviewed_at > created_at
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
          resource: { ...post, content_type: post.content_type || 'carousel' },
        };
      });

      const storyEvents: CalendarEvent[] = (stories || []).map((story) => ({
        id: story.id,
        title: story.tema || 'Story',
        start: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        end: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        resource: { ...story, content_type: 'stories' },
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
      const table = contentType === 'stories' ? 'stories' : 'posts';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      toast.success('Publicação eliminada com sucesso');
      setSelectedEvent(null);
      fetchScheduledContent();
    } catch (error) {
      logger.error('Erro ao eliminar publicação', error);
      toast.error('Falha ao eliminar publicação');
    }
  };

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEvent; start: Date }) => {
      try {
        const table = event.resource.content_type === 'stories' ? 'stories' : 'posts';
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
    const isStory = event.resource.content_type === 'stories';
    const isPublished = event.resource.status === 'published';
    const isApproved = event.resource.status === 'approved';
    
    let backgroundColor;
    let border = 'none';
    
    if (isPublished) {
      // 🟢 Posts PUBLICADOS - Verde brilhante
      backgroundColor = '#10B981';
      border = '2px solid #059669';
    } else if (isApproved) {
      // 🟡 Posts APROVADOS mas não publicados - Laranja/Amarelo
      backgroundColor = '#F59E0B';
      border = '2px solid #D97706';
    } else {
      // 🔵 Posts AGENDADOS - Azul
      backgroundColor = isStory ? '#8B5CF6' : '#3B82F6';
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

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const isStory = event.resource.content_type === 'stories';
    const isCarousel = event.resource.content_type === 'carousel';
    const isPublished = event.resource.status === 'published';
    const isApproved = event.resource.status === 'approved';
    
    let icon;
    if (isStory) {
      icon = <Video className="h-3 w-3 flex-shrink-0" />;
    } else if (isCarousel) {
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
    
    // Normal view: thumbnail + title
    const thumbnailUrl = isStory 
      ? event.resource.story_image_url 
      : event.resource.template_a_images?.[0];

    return (
      <div className="flex items-start gap-2.5 group">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={String(event.title || '')}
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate leading-tight">{event.title}</div>
          <div className="flex items-center gap-1.5 mt-1">
            {icon}
            <span className="text-xs opacity-90">
              {isStory ? 'Story' : isCarousel ? 'Carousel' : 'Post'}
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
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto bg-gradient-to-br from-white to-gray-50">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-[1900px] mx-auto">
              {/* Main Calendar Section */}
              <div className="flex-1 animate-slide-up space-y-4 lg:space-y-6 min-w-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-3 lg:gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5 lg:gap-3">
                      <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                      </div>
                      <span className="truncate">Calendário</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 ml-12 lg:ml-[60px] hidden sm:block">
                      Arraste e solte para reagendar • Clique para ver detalhes
                    </p>
                  </div>
                  
                  {/* View Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant={viewMode === 'normal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('normal')}
                      className="gap-1.5"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Normal</span>
                    </Button>
                    <Button
                      variant={viewMode === 'compact' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('compact')}
                      className="gap-1.5"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Compacta</span>
                    </Button>
                  </div>
                </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                <Card className="p-4 lg:p-5 border-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Este Mês</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{monthStats.total}</p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 lg:p-5 border-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Posts Agendados</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{monthStats.posts}</p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#4169A0]/10 flex items-center justify-center flex-shrink-0">
                      <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-[#4169A0]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 lg:p-5 border-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Stories Agendadas</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{monthStats.stories}</p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                      <Video className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B5CF6]" />
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
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-8 rounded border-2 border-green-700" style={{ backgroundColor: '#10B981' }}></div>
                          <span className="text-xs font-medium text-green-600">✓ Publicado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-8 rounded border-2 border-orange-700" style={{ backgroundColor: '#F59E0B' }}></div>
                          <span className="text-xs font-medium text-orange-600">⏳ Aprovado (pendente publicação)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-8 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                          <span className="text-xs font-medium text-blue-600">📅 Agendado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-8 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                          <span className="text-xs font-medium text-purple-600">📅 Story Agendada</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Video className="h-3 w-3" /> = Story • 
                        <LayoutGrid className="h-3 w-3 ml-1" /> = Carousel • 
                        <div className="h-2 w-2 rounded-full bg-muted ml-1" /> = Post
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Filters */}
                <Card className="p-4 lg:p-5 border-2 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
                    </div>
                    <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="posts">Apenas Posts</SelectItem>
                        <SelectItem value="stories">Apenas Stories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              </div>

              <div className="bg-white rounded-xl lg:rounded-2xl shadow-md p-3 sm:p-4 lg:p-6 border border-gray-100">
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
                    style={{ height: window.innerWidth < 640 ? 500 : window.innerWidth < 1024 ? 600 : 700 }}
                    culture="pt-PT"
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
            <div className="hidden xl:block w-80 animate-slide-up space-y-4 flex-shrink-0">
              <Card className="p-5 border-2 sticky top-4 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Grid de Conteúdos
                </h3>
                
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
                    <div className="grid grid-cols-3 gap-2">
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
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <LayoutGrid className="h-6 w-6 text-muted-foreground" />
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
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Video className="h-6 w-6 text-muted-foreground" />
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
        </div>
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
