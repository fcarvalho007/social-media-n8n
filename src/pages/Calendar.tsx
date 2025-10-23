import { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchScheduledContent = async () => {
    setLoading(true);
    try {
      const [{ data: posts }, { data: stories }] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('status', 'approved')
          .not('scheduled_date', 'is', null),
        supabase
          .from('stories')
          .select('*')
          .eq('status', 'approved')
          .not('scheduled_date', 'is', null),
      ]);

      const postEvents: CalendarEvent[] = (posts || []).map((post) => ({
        id: post.id,
        title: post.tema,
        start: new Date(post.scheduled_date),
        end: new Date(post.scheduled_date),
        resource: { ...post, content_type: post.content_type || 'carousel' },
      }));

      const storyEvents: CalendarEvent[] = (stories || []).map((story) => ({
        id: story.id,
        title: story.tema || 'Story',
        start: new Date(story.scheduled_date),
        end: new Date(story.scheduled_date),
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
    return {
      style: {
        backgroundColor: isStory ? '#8B5CF6' : '#4169A0',
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        padding: '4px 8px',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="flex items-center gap-1 truncate">
      <span className="text-xs font-semibold truncate">{event.title}</span>
    </div>
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto bg-gradient-to-br from-white to-gray-50">
            <div className="animate-slide-up space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <CalendarIcon className="h-8 w-8 text-primary" />
                    Calendário de Publicações
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Visualize e gerencie seus posts agendados
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="h-8 px-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#4169A0]" />
                    Posts
                  </Badge>
                  <Badge variant="secondary" className="h-8 px-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                    Stories
                  </Badge>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                {loading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DnDCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor={(event: CalendarEvent) => event.start as Date}
                    endAccessor={(event: CalendarEvent) => event.end as Date}
                    style={{ height: 600 }}
                    culture="pt-PT"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Detalhes da Publicação
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                <Badge className="mt-2">
                  {selectedEvent.resource.content_type === 'stories' ? 'Story' : 'Post'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(selectedEvent.start as Date, "dd 'de' MMMM 'às' HH:mm", {
                    locale: pt,
                  })}
                </span>
              </div>

              {selectedEvent.resource.template_a_images?.[0] && (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <img
                    src={selectedEvent.resource.template_a_images[0]}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {selectedEvent.resource.story_image_url && (
                <div className="relative aspect-[9/16] max-h-96 rounded-lg overflow-hidden border mx-auto">
                  <img
                    src={selectedEvent.resource.story_image_url}
                    alt="Story Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  const path =
                    selectedEvent.resource.content_type === 'stories'
                      ? `/review-story/${selectedEvent.id}`
                      : `/review/${selectedEvent.id}`;
                  window.location.href = path;
                }}
              >
                Ver Detalhes Completos
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Calendar;
