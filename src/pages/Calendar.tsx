import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isToday, isSameMonth, startOfMonth, endOfMonth, isPast, isFuture, startOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, LayoutGrid, Video, TrendingUp, Filter, Trash2, Maximize2, Minimize2, ImageIcon, PenTool, AlertCircle, CalendarCheck, CalendarClock, History, Instagram, Linkedin, ChevronDown, RefreshCw, WifiOff, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { UpcomingPublications } from '@/components/calendar/UpcomingPublications';

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
  error_log?: string | null;
  failed_at?: string | null;
  recovery_token?: string;
  selected_networks?: string[];
  external_post_ids?: Record<string, string>;
}

interface CalendarEvent extends Event {
  id: string;
  resource: ScheduledPost;
}

const CACHE_KEY = 'calendar_events_cache';
const CACHE_TIMESTAMP_KEY = 'calendar_last_updated';

const Calendar = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'stories' | 'failed'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'future'>('all');
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');
  const [expandedView, setExpandedView] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>(isMobile ? 'day' : 'month');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwipping, setIsSwipping] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState<number>(600);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

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

  // Calculate dynamic calendar height based on window height
  const getCalendarHeight = useCallback((mobile: boolean): number => {
    const viewportHeight = window.innerHeight;
    // Discount space for header (~80px), stats cards (~120px), legend/filters (~140px), padding (~80px)
    const reservedSpace = 420;
    const calculatedHeight = viewportHeight - reservedSpace;
    
    if (mobile) {
      return Math.max(360, Math.min(calculatedHeight, 600));
    }
    return Math.max(520, Math.min(calculatedHeight, 820));
  }, []);

  // Update calendar height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      setCalendarHeight(getCalendarHeight(isMobile));
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, [isMobile, getCalendarHeight]);

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

  const fetchScheduledContent = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setFetchError(null);
    }
    
    try {
      // Fetch posts with ALL relevant statuses (not just 4)
      const [{ data: posts, error: postsError }, { data: stories, error: storiesError }, { data: drafts, error: draftsError }] = await Promise.all([
        supabase
          .from('posts')
          .select('id, tema, content_type, status, scheduled_date, reviewed_at, created_at, published_at, template_a_images, error_log, failed_at, recovery_token, selected_networks, external_post_ids')
          .in('status', ['approved', 'published', 'failed', 'scheduled', 'waiting_for_approval', 'pending', 'publishing', 'requires_attention']),
        supabase
          .from('stories')
          .select('id, tema, status, scheduled_date, reviewed_at, created_at, story_image_url')
          .in('status', ['approved', 'published', 'pending']),
        // Also fetch drafts to show in calendar
        supabase
          .from('posts_drafts')
          .select('id, caption, platform, media_urls, scheduled_date, scheduled_time, created_at, status')
          .eq('status', 'draft'),
      ]);

      if (postsError || storiesError) {
        throw new Error(postsError?.message || storiesError?.message);
      }

      const postEvents: CalendarEvent[] = (posts || []).map((post) => {
        let eventDate: Date;
        if (post.status === 'failed' && post.failed_at) {
          eventDate = new Date(post.failed_at);
        } else if (post.scheduled_date) {
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
          resource: { 
            ...post, 
            content_type: (post.content_type || 'carousel') as 'carousel' | 'stories',
            error_log: post.error_log,
            failed_at: post.failed_at,
            recovery_token: post.recovery_token,
            selected_networks: post.selected_networks || [],
            external_post_ids: (post.external_post_ids as Record<string, string>) || {},
          },
        };
      });

      const storyEvents: CalendarEvent[] = (stories || []).map((story) => ({
        id: story.id,
        title: story.tema || 'Story',
        start: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        end: story.scheduled_date ? new Date(story.scheduled_date) : new Date(story.reviewed_at || story.created_at),
        resource: { ...story, content_type: 'stories' as const },
      }));

      // Convert drafts to calendar events
      const draftEvents: CalendarEvent[] = (drafts || []).map((draft) => {
        // Use scheduled_date if available, otherwise use created_at
        let eventDate: Date;
        if (draft.scheduled_date) {
          // Combine scheduled_date with scheduled_time if available
          const dateStr = draft.scheduled_date;
          const timeStr = draft.scheduled_time || '12:00';
          eventDate = new Date(`${dateStr}T${timeStr}:00`);
        } else {
          eventDate = new Date(draft.created_at);
        }
        
        // Get first thumbnail from media_urls
        let thumbnail: string | null = null;
        if (draft.media_urls && Array.isArray(draft.media_urls) && draft.media_urls.length > 0) {
          const first = draft.media_urls[0];
          if (typeof first === 'string') thumbnail = first;
          else if (first && typeof first === 'object') thumbnail = (first as { url?: string }).url || null;
        }
        
        return {
          id: draft.id,
          title: draft.caption?.substring(0, 50) || 'Rascunho',
          start: eventDate,
          end: eventDate,
          resource: {
            id: draft.id,
            content_type: 'carousel' as const,
            status: 'draft',
            template_a_images: thumbnail ? [thumbnail] : [],
            scheduled_date: draft.scheduled_date,
          },
        };
      });

      const allEvents = [...postEvents, ...storyEvents, ...draftEvents];
      setEvents(allEvents);
      setRetryCount(0);
      setFetchError(null);
      
      // Save to localStorage cache
      try {
        const cacheData = allEvents.map(e => ({
          ...e,
          start: (e.start as Date).toISOString(),
          end: (e.end as Date).toISOString(),
        }));
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
        setLastUpdated(new Date());
      } catch (cacheError) {
        logger.warn('Failed to save cache', cacheError);
      }
      
    } catch (error) {
      logger.error('Erro ao carregar conteúdo agendado', error);
      setFetchError('Falha ao carregar dados');
      
      // Try to load from cache if available
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && events.length === 0) {
          const parsed = JSON.parse(cachedData);
          const restoredEvents = parsed.map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }));
          setEvents(restoredEvents);
          if (cachedTimestamp) {
            setLastUpdated(new Date(cachedTimestamp));
          }
          toast.warning('A usar dados em cache. Tentando reconectar...');
        }
      } catch (cacheError) {
        logger.warn('Failed to load cache', cacheError);
      }
      
      // Auto-retry logic (max 3 retries)
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchScheduledContent(true);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        toast.error('Falha ao carregar calendário após várias tentativas');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load cache on initial mount (before fetch completes) - only as offline fallback
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      // Only use cache if we're offline or as initial placeholder
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const restoredEvents = parsed.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
        // Only set if we don't have events yet (prevents showing stale data)
        if (events.length === 0) {
          setEvents(restoredEvents);
          if (cachedTimestamp) {
            setLastUpdated(new Date(cachedTimestamp));
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load initial cache', error);
    }
  }, []);

  // Sync from Getlate API
  const syncFromGetlate = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const toastId = toast.loading('A sincronizar com Getlate...');
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-getlate-posts', {
        body: {
          date_from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 6 months
        },
      });
      
      if (error) throw error;
      
      toast.dismiss(toastId);
      
      if (data.synced > 0) {
        toast.success(`Sincronizados ${data.synced} posts do Getlate`);
        await fetchScheduledContent();
      } else {
        toast.info('Calendário já está atualizado');
      }
      
      // Store last sync timestamp
      localStorage.setItem('getlate_last_sync_at', new Date().toISOString());
    } catch (error) {
      console.error('Sync error:', error);
      toast.dismiss(toastId);
      // Silent fail for auto-sync, only show error for manual sync
    } finally {
      setIsSyncing(false);
    }
  };

  // Smart navigation: suggest going to month with content if current month is empty
  const [hasShownNavigationHint, setHasShownNavigationHint] = useState(false);
  
  useEffect(() => {
    if (loading || hasShownNavigationHint) return;
    
    // Auto-sync from Getlate if events are empty or it's been a while
    if (!hasAutoSynced && events.length === 0) {
      const lastSync = localStorage.getItem('getlate_last_sync_at');
      const shouldSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > 60 * 60 * 1000); // 1 hour
      
      if (shouldSync) {
        setHasAutoSynced(true);
        syncFromGetlate();
        return;
      }
    }
    
    if (events.length === 0) return;
    
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);
    
    const currentMonthEvents = events.filter(e => {
      const eventDate = e.start as Date;
      return eventDate >= currentMonthStart && eventDate <= currentMonthEnd;
    });
    
    // If current month is empty but there are events in other months
    if (currentMonthEvents.length === 0 && events.length > 0) {
      // Find the closest month with content (prefer future, fallback to past)
      const futureEvents = events.filter(e => (e.start as Date) > currentMonthEnd);
      const pastEvents = events.filter(e => (e.start as Date) < currentMonthStart);
      
      let targetMonth: Date | null = null;
      
      if (futureEvents.length > 0) {
        // Sort ascending to get nearest future
        futureEvents.sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());
        targetMonth = startOfMonth(futureEvents[0].start as Date);
      } else if (pastEvents.length > 0) {
        // Sort descending to get most recent past
        pastEvents.sort((a, b) => (b.start as Date).getTime() - (a.start as Date).getTime());
        targetMonth = startOfMonth(pastEvents[0].start as Date);
      }
      
      if (targetMonth && !isSameMonth(targetMonth, currentMonth)) {
        setHasShownNavigationHint(true);
        toast.info(`Nenhum conteúdo em ${format(currentMonth, 'MMMM yyyy', { locale: pt })}`, {
          description: `Conteúdo disponível em ${format(targetMonth, 'MMMM yyyy', { locale: pt })}`,
          action: {
            label: 'Ir para lá',
            onClick: () => setCurrentMonth(targetMonth!)
          },
          duration: 8000
        });
      }
    }
  }, [loading, events, currentMonth, hasShownNavigationHint, hasAutoSynced, isSyncing]);

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

    // Also listen for drafts changes
    const draftsChannel = supabase
      .channel('calendar-drafts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts_drafts' }, () => {
        fetchScheduledContent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(draftsChannel);
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
    const isFailed = event.resource.status === 'failed';
    const isScheduled = event.resource.status === 'scheduled';
    const isDraft = event.resource.status === 'draft';
    const isPending = event.resource.status === 'pending' || event.resource.status === 'waiting_for_approval';
    const isPublishing = event.resource.status === 'publishing';
    const isRequiresAttention = event.resource.status === 'requires_attention';
    
    // Check if approved post has future scheduled_date (legacy scheduled posts)
    const isLegacyScheduled = isApproved && 
      event.resource.scheduled_date && 
      new Date(event.resource.scheduled_date) > new Date();
    
    let backgroundColor;
    let border = 'none';
    let borderStyle = 'solid';
    
    if (isFailed || isRequiresAttention) {
      backgroundColor = '#EF4444';
      border = '2px solid #DC2626';
    } else if (isDraft) {
      // Drafts - gray/neutral with dotted border
      backgroundColor = '#6B7280';
      border = '2px dotted #4B5563';
      borderStyle = 'dotted';
    } else if (isPending || isPublishing) {
      // Pending/waiting for approval - orange/amber
      backgroundColor = '#F59E0B';
      border = '2px dashed #D97706';
      borderStyle = 'dashed';
    } else if (isScheduled || isLegacyScheduled) {
      // Scheduled posts - blue with dashed border for clear distinction
      backgroundColor = '#3B82F6';
      border = '2px dashed #1D4ED8';
      borderStyle = 'dashed';
    } else if (isPublished) {
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
        borderStyle,
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        padding: '4px 8px',
      },
    };
  };

  const filteredEvents = useMemo(() => {
    const today = startOfDay(new Date());
    
    let filtered = events;
    
    // Apply time filter first
    if (timeFilter === 'past') {
      filtered = filtered.filter(e => startOfDay(e.start as Date) < today);
    } else if (timeFilter === 'today') {
      filtered = filtered.filter(e => isToday(e.start as Date));
    } else if (timeFilter === 'future') {
      filtered = filtered.filter(e => startOfDay(e.start as Date) > today);
    }
    
    // Then apply type filter
    if (filterType === 'posts') {
      filtered = filtered.filter(e => e.resource.content_type !== 'stories' && e.resource.status !== 'failed');
    } else if (filterType === 'stories') {
      filtered = filtered.filter(e => e.resource.content_type === 'stories');
    } else if (filterType === 'failed') {
      filtered = filtered.filter(e => e.resource.status === 'failed');
    }
    
    return filtered;
  }, [events, filterType, timeFilter]);

  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const today = startOfDay(new Date());
    
    const monthEvents = events.filter(e => {
      const eventDate = e.start as Date;
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    const posts = monthEvents.filter(e => e.resource.content_type !== 'stories' && e.resource.status !== 'failed').length;
    const stories = monthEvents.filter(e => e.resource.content_type === 'stories').length;
    const failed = monthEvents.filter(e => e.resource.status === 'failed').length;
    const scheduled = monthEvents.filter(e => {
      // Count posts with explicit 'scheduled' status + approved posts with future date
      const eventDate = startOfDay(e.start as Date);
      const isScheduledStatus = e.resource.status === 'scheduled';
      const isLegacyScheduled = e.resource.status === 'approved' && eventDate > today;
      return isScheduledStatus || isLegacyScheduled;
    }).length;
    const published = monthEvents.filter(e => e.resource.status === 'published').length;
    
    // Network breakdown
    const instagramPosts = monthEvents.filter(e => {
      const networks = e.resource.selected_networks || [];
      return networks.includes('instagram') || e.resource.content_type === 'stories';
    }).length;
    const linkedinPosts = monthEvents.filter(e => {
      const networks = e.resource.selected_networks || [];
      return networks.includes('linkedin');
    }).length;
    
    return { total: monthEvents.length, posts, stories, failed, scheduled, published, instagramPosts, linkedinPosts };
  }, [events, currentMonth]);

  // Custom toolbar for better mobile navigation
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-4 border-b w-full overflow-x-hidden">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
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
    <>
      <div className="space-y-4 lg:space-y-6 min-h-screen">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-7xl mx-auto w-full px-2 sm:px-0">
          {/* Main Calendar Section */}
          <div className="flex-1 animate-fade-in space-y-4 lg:space-y-5 min-w-0 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                  </div>
                  <span>Calendário</span>
                </h1>
                <div className="flex items-center gap-3 mt-1 ml-[52px] lg:ml-[60px]">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Arraste para reagendar publicações
                  </p>
                  {/* Sync Status Indicator */}
                  <div className="flex items-center gap-2">
                    {/* Manual Refresh Button - Always visible */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => fetchScheduledContent()}
                            disabled={loading}
                            className="flex items-center justify-center h-7 w-7 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{loading ? 'A sincronizar...' : 'Atualizar calendário'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Status Indicator */}
                    {loading ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="hidden sm:inline">A sincronizar...</span>
                      </span>
                    ) : fetchError ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                              <WifiOff className="h-3 w-3" />
                              <span className="hidden sm:inline">Offline</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>A usar dados em cache. Clique no botão para atualizar.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : lastUpdated ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 text-xs text-green-600/70 dark:text-green-400/70">
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {format(lastUpdated, 'HH:mm', { locale: pt })}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Última atualização: {format(lastUpdated, "d 'de' MMMM 'às' HH:mm", { locale: pt })}</p>
                            <p className="text-xs text-muted-foreground mt-1">{events.length} items carregados</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="default"
                  size="default"
                  onClick={() => navigate('/manual-create')}
                  className="gap-2 shadow-sm"
                >
                  <PenTool className="h-4 w-4" />
                  <span className="font-medium">Criar post manual</span>
                </Button>

                <div className="flex items-center gap-1 ml-2 border-l pl-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={expandedView ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setExpandedView(!expandedView)}
                          className="h-9 w-9 p-0"
                        >
                          {expandedView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {expandedView ? 'Vista compacta' : 'Vista expandida'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Stats Cards - Hidden when expanded */}
            {!expandedView && (
              <>
                {/* Stats Cards - Redesigned with better layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Published */}
              <Card className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50 dark:border-green-800/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CalendarCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wide">Publicados</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{monthStats.published}</p>
                  </div>
                </div>
              </Card>

              {/* Scheduled */}
              <Card className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">Agendados</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{monthStats.scheduled}</p>
                  </div>
                </div>
              </Card>

              {/* Posts */}
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Posts</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{monthStats.posts}</p>
                  </div>
                </div>
              </Card>

              {/* Stories */}
              <Card className="p-3 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-200/50 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wide">Stories</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{monthStats.stories}</p>
                  </div>
                </div>
              </Card>

              {/* Instagram */}
              <Card className="p-3 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border-pink-200/50 dark:border-pink-800/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                    <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-pink-600/70 dark:text-pink-400/70 uppercase tracking-wide">Instagram</p>
                    <p className="text-xl font-bold text-pink-700 dark:text-pink-300">{monthStats.instagramPosts}</p>
                  </div>
                </div>
              </Card>

              {/* LinkedIn or Failed */}
              {monthStats.failed > 0 ? (
                <Card className="p-3 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200/50 dark:border-red-800/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-red-600/70 dark:text-red-400/70 uppercase tracking-wide">Falhados</p>
                      <p className="text-xl font-bold text-red-700 dark:text-red-300">{monthStats.failed}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-200/50 dark:border-sky-800/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
                      <Linkedin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-sky-600/70 dark:text-sky-400/70 uppercase tracking-wide">LinkedIn</p>
                      <p className="text-xl font-bold text-sky-700 dark:text-sky-300">{monthStats.linkedinPosts}</p>
                    </div>
                  </div>
                </Card>
              )}
                </div>
              </>
            )}

            {/* Upcoming Publications Panel */}
            {!expandedView && (
              <UpcomingPublications compact />
            )}

            {/* Filter Bar - Redesigned */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border">
              {/* Time Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-background rounded-lg border shadow-sm">
                <Button
                  variant={timeFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('all')}
                  className="h-7 px-3 text-xs font-medium"
                >
                  Todos
                </Button>
                <Button
                  variant={timeFilter === 'past' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('past')}
                  className="h-7 px-3 text-xs font-medium gap-1"
                >
                  <History className="h-3 w-3" />
                  Passado
                </Button>
                <Button
                  variant={timeFilter === 'today' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('today')}
                  className="h-7 px-3 text-xs font-medium gap-1"
                >
                  <CalendarIcon className="h-3 w-3" />
                  Hoje
                </Button>
                <Button
                  variant={timeFilter === 'future' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFilter('future')}
                  className="h-7 px-3 text-xs font-medium gap-1"
                >
                  <CalendarClock className="h-3 w-3" />
                  Futuro
                </Button>
              </div>

              {/* Right side: Legend + Type Filter */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Compact Legend */}
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground">Publicado</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 border border-dashed border-blue-700"></div>
                    <span className="text-muted-foreground">Agendado</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                    <span className="text-muted-foreground">Aprovado</span>
                  </span>
                  {monthStats.failed > 0 && (
                    <span className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                      <span className="text-muted-foreground">Falhado</span>
                    </span>
                  )}
                </div>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                    <Filter className="h-3 w-3 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="posts">Posts</SelectItem>
                    <SelectItem value="stories">Stories</SelectItem>
                    <SelectItem value="failed">Falhados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calendar Container */}
            <Card 
              className={`p-3 sm:p-4 lg:p-5 border shadow-sm overflow-hidden transition-transform ${isSwipping ? 'scale-[0.99]' : ''}`}
              onTouchStart={isMobile ? onTouchStart : undefined}
              onTouchMove={isMobile ? onTouchMove : undefined}
              onTouchEnd={isMobile ? onTouchEnd : undefined}
            >
                {loading ? (
                  <div 
                    className="flex items-center justify-center w-full"
                    style={{ height: calendarHeight, minHeight: isMobile ? 360 : 520 }}
                  >
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DnDCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor={(event: CalendarEvent) => event.start as Date}
                    endAccessor={(event: CalendarEvent) => event.end as Date}
                    style={{ 
                      height: calendarHeight,
                      minHeight: isMobile ? 360 : 520
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
                      work_week: 'Semana de trabalho',
                      allDay: 'Todo o dia',
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
              </Card>
            </div>

            {/* Side Grid Panel - Hidden on mobile/tablet, visible on large screens */}
            <div className="hidden lg:block w-64 xl:w-72 2xl:w-80 animate-slide-up space-y-4 flex-shrink-0">
              <Card className="p-4 sm:p-5 xl:p-6 border-2 sticky top-4 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col shadow-lg w-full">
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
                    <div className="grid grid-cols-2 gap-2 xl:gap-2.5">
                      {feedPosts.map((event) => {
                        const thumbnailUrl = event.resource.template_a_images?.[0];
                        const isScheduled = !!event.resource.scheduled_date;
                        const isPublished = event.resource.status === 'published';
                        return (
                          <div
                            key={event.id}
                            className="relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 transition-all group bg-muted/20"
                            onClick={() => setSelectedEvent(event)}
                          >
                             {thumbnailUrl ? (
                              <>
                                <img 
                                  src={thumbnailUrl} 
                                  alt={String(event.title || '')}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    if (target.nextElementSibling) {
                                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                                <div 
                                  className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-2 gap-1"
                                  style={{ display: 'none' }}
                                >
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-[9px] text-muted-foreground font-medium text-center">Erro ao carregar</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-2 gap-1">
                                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground font-medium text-center">Sem imagem</span>
                              </div>
                            )}
                            {/* Status indicators */}
                            <div className="absolute top-1 right-1 flex gap-1">
                              {isPublished && (
                                <div className="bg-green-500 rounded-full p-1 shadow-md">
                                  <CalendarCheck className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                              {isScheduled && !isPublished && (
                                <div className="bg-primary rounded-full p-1 shadow-md">
                                  <Clock className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            {/* Hover overlay with title */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                              <span className="text-[9px] text-white font-medium truncate w-full">{event.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {feedPosts.length === 0 && (
                      <div className="text-center py-4 bg-muted/30 rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Nenhum post em {format(currentMonth, 'MMMM', { locale: pt })}
                        </p>
                        {events.filter(e => e.resource.content_type !== 'stories').length > 0 && (
                          <>
                            <p className="text-[10px] text-muted-foreground/70">
                              {events.filter(e => e.resource.content_type !== 'stories').length} posts em outros meses
                            </p>
                            <Button 
                              variant="link" 
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setTimeFilter('all')}
                            >
                              Ver todos
                            </Button>
                          </>
                        )}
                      </div>
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {stories.map((event) => {
                        const thumbnailUrl = event.resource.story_image_url;
                        const isScheduled = !!event.resource.scheduled_date;
                        const isPublished = event.resource.status === 'published';
                        return (
                          <div
                            key={event.id}
                            className="relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 transition-all group bg-muted/20"
                            onClick={() => setSelectedEvent(event)}
                          >
                             {thumbnailUrl ? (
                              <>
                                <img 
                                  src={thumbnailUrl} 
                                  alt={String(event.title || '')}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    if (target.nextElementSibling) {
                                      (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                                <div 
                                  className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-950 flex flex-col items-center justify-center p-2 gap-1"
                                  style={{ display: 'none' }}
                                >
                                  <Video className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-[8px] text-muted-foreground font-medium text-center">Erro</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-950 flex flex-col items-center justify-center p-2 gap-1">
                                <Video className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                <span className="text-[8px] text-purple-600 dark:text-purple-300 font-medium text-center">Sem imagem</span>
                              </div>
                            )}
                            {/* Status indicators */}
                            <div className="absolute top-1 right-1 flex gap-0.5">
                              {isPublished && (
                                <div className="bg-green-500 rounded-full p-0.5 shadow-md">
                                  <CalendarCheck className="h-2 w-2 text-white" />
                                </div>
                              )}
                              {isScheduled && !isPublished && (
                                <div className="bg-primary rounded-full p-0.5 shadow-md">
                                  <Clock className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {stories.length === 0 && (
                      <div className="text-center py-4 bg-muted/30 rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma story em {format(currentMonth, 'MMMM', { locale: pt })}
                        </p>
                        {events.filter(e => e.resource.content_type === 'stories').length > 0 && (
                          <>
                            <p className="text-[10px] text-muted-foreground/70">
                              {events.filter(e => e.resource.content_type === 'stories').length} stories em outros meses
                            </p>
                            <Button 
                              variant="link" 
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => {
                                // Navigate to month with stories
                                const storiesEvents = events.filter(e => e.resource.content_type === 'stories');
                                if (storiesEvents.length > 0) {
                                  const sorted = [...storiesEvents].sort((a, b) => 
                                    (b.start as Date).getTime() - (a.start as Date).getTime()
                                  );
                                  setCurrentMonth(startOfMonth(sorted[0].start as Date));
                                }
                              }}
                            >
                              Ver todos
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
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

              {selectedEvent.resource.template_a_images && selectedEvent.resource.template_a_images.length > 0 && (
                <div className="space-y-3">
                  {selectedEvent.resource.template_a_images.length > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid className="h-4 w-4" />
                        Carousel com {selectedEvent.resource.template_a_images.length} imagens
                      </span>
                    </div>
                  )}
                  <div className={`${selectedEvent.resource.template_a_images.length > 1 ? 'grid grid-cols-2 gap-2' : ''}`}>
                    {selectedEvent.resource.template_a_images.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow bg-muted/30"
                      >
                        <img
                          src={imgUrl}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-auto max-h-[300px] object-contain mx-auto"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center gap-2"
                          style={{ display: 'none' }}
                        >
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Imagem não disponível</span>
                        </div>
                        {selectedEvent.resource.template_a_images!.length > 1 && (
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            {idx + 1}/{selectedEvent.resource.template_a_images!.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.resource.story_image_url && (
                <div className="relative rounded-xl overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow mx-auto bg-muted/30 max-w-[240px]">
                  <img
                    src={selectedEvent.resource.story_image_url}
                    alt="Story Preview"
                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div 
                    className="w-full h-80 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-950 flex flex-col items-center justify-center gap-2"
                    style={{ display: 'none' }}
                  >
                    <Video className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Story não disponível</span>
                  </div>
                </div>
              )}

              {/* Social Links for Published Posts */}
              {selectedEvent.resource.status === 'published' && selectedEvent.resource.content_type !== 'stories' && (
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="w-full text-xs text-green-700 dark:text-green-300 font-medium mb-1">Publicado em:</p>
                  {selectedEvent.resource.selected_networks?.includes('instagram') && (
                    selectedEvent.resource.external_post_ids?.instagram ? (
                      <a 
                        href={selectedEvent.resource.external_post_ids.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Badge variant="outline" className="gap-1.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-300 dark:border-pink-700 cursor-pointer hover:bg-pink-500/20 transition-colors">
                          <Instagram className="h-3 w-3 text-pink-600" />
                          Ver no Instagram
                        </Badge>
                      </a>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-300 dark:border-pink-700">
                        <Instagram className="h-3 w-3 text-pink-600" />
                        Instagram
                      </Badge>
                    )
                  )}
                  {selectedEvent.resource.selected_networks?.includes('linkedin') && (
                    selectedEvent.resource.external_post_ids?.linkedin ? (
                      <a 
                        href={selectedEvent.resource.external_post_ids.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Badge variant="outline" className="gap-1.5 bg-blue-500/10 border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-500/20 transition-colors">
                          <Linkedin className="h-3 w-3 text-blue-600" />
                          Ver no LinkedIn
                        </Badge>
                      </a>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 bg-blue-500/10 border-blue-300 dark:border-blue-700">
                        <Linkedin className="h-3 w-3 text-blue-600" />
                        LinkedIn
                      </Badge>
                    )
                  )}
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
    </>
  );
};

export default Calendar;
