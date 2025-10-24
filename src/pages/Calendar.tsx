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
import { Calendar as CalendarIcon, Clock, LayoutGrid, Video, TrendingUp, Filter, Trash2 } from 'lucide-react';
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

  const fetchScheduledContent = async () => {
    setLoading(true);
    try {
      const [{ data: posts }, { data: stories }] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .in('status', ['approved', 'published']),
        supabase
          .from('stories')
          .select('*')
          .in('status', ['approved', 'published']),
      ]);

      const postEvents: CalendarEvent[] = (posts || []).map((post) => ({
        id: post.id,
        title: post.tema,
        start: post.scheduled_date ? new Date(post.scheduled_date) : new Date(post.reviewed_at || post.created_at),
        end: post.scheduled_date ? new Date(post.scheduled_date) : new Date(post.reviewed_at || post.created_at),
        resource: { ...post, content_type: post.content_type || 'carousel' },
      }));

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
    const isScheduled = !!event.resource.scheduled_date;
    const isPublished = event.resource.status === 'published';
    
    let backgroundColor = isStory ? '#8B5CF6' : '#4169A0';
    let opacity = 0.9;
    
    if (isPublished) {
      opacity = 0.6; // Published posts are more transparent
    } else if (!isScheduled) {
      opacity = 0.75; // Approved but not scheduled
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity,
        color: 'white',
        border: '0px',
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
    return (
      <div className="flex items-center gap-1 truncate group">
        {isStory ? (
          <Video className="h-3 w-3 flex-shrink-0" />
        ) : (
          <LayoutGrid className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold truncate">{event.title}</span>
      </div>
    );
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto bg-gradient-to-br from-white to-gray-50">
            <div className="animate-slide-up space-y-6">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-primary" />
                    </div>
                    Calendário de Publicações
                  </h1>
                  <p className="text-muted-foreground mt-2 ml-[60px]">
                    Arraste e solte para reagendar • Clique para ver detalhes
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 border-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Este Mês</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{monthStats.total}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Posts Agendados</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{monthStats.posts}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[#4169A0]/10 flex items-center justify-center">
                      <LayoutGrid className="h-6 w-6 text-[#4169A0]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Stories Agendadas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{monthStats.stories}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                      <Video className="h-6 w-6 text-[#8B5CF6]" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between bg-white rounded-xl p-4 border-2">
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

              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                {loading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DnDCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor={(event: CalendarEvent) => event.start as Date}
                    endAccessor={(event: CalendarEvent) => event.end as Date}
                    style={{ height: 650 }}
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
