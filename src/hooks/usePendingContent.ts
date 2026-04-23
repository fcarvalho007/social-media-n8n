import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingItem {
  id: string;
  type: 'story' | 'carousel' | 'post' | 'draft' | 'scheduled';
  thumbnail: string | null;
  caption: string | null;
  createdAt: string;
  scheduledDate?: string | null;
  route: string;
}

interface PendingContentResult {
  items: PendingItem[];
  totalCount: number;
  pendingApprovalCount: number;
  draftsCount: number;
  scheduledCount: number;
  loading: boolean;
}

export function usePendingContent(limit: number = 6): PendingContentResult {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchPendingContent = async () => {
      try {
        setLoading(true);

        // Stories pendentes (a aguardar aprovação)
        const { data: stories } = await supabase
          .from('stories')
          .select('id, story_image_url, caption, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(limit);

        // Posts a aguardar aprovação
        const { data: posts } = await supabase
          .from('posts')
          .select('id, template_a_images, media_items, caption, created_at, content_type, status')
          .in('status', ['pending', 'waiting_for_approval', 'publishing'])
          .order('created_at', { ascending: false })
          .limit(limit);

        // Posts agendados (scheduled futuros)
        const { data: scheduled } = await supabase
          .from('posts')
          .select('id, template_a_images, media_items, caption, created_at, content_type, status, scheduled_date')
          .eq('status', 'scheduled')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true })
          .limit(limit);

        // Rascunhos
        const { data: drafts } = await supabase
          .from('posts_drafts')
          .select('id, media_urls, caption, created_at, platform')
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!mounted) return;

        const storyItems: PendingItem[] = (stories || []).map((story) => ({
          id: story.id,
          type: 'story' as const,
          thumbnail: story.story_image_url,
          caption: story.caption,
          createdAt: story.created_at || '',
          route: `/review-story/${story.id}`,
        }));

        const extractThumb = (post: { media_items?: unknown; template_a_images?: string[] | null }) => {
          let thumbnail: string | null = null;
          if (post.media_items && Array.isArray(post.media_items) && post.media_items.length > 0) {
            const firstItem = post.media_items[0] as { url?: string; preview?: string };
            thumbnail = firstItem.url || firstItem.preview || null;
          } else if (post.template_a_images && post.template_a_images.length > 0) {
            thumbnail = post.template_a_images[0];
          }
          return thumbnail;
        };

        const postItems: PendingItem[] = (posts || []).map((post) => ({
          id: post.id,
          type: post.content_type === 'carousel' ? 'carousel' as const : 'post' as const,
          thumbnail: extractThumb(post),
          caption: post.caption,
          createdAt: post.created_at || '',
          route: `/review/${post.id}`,
        }));

        const scheduledItems: PendingItem[] = (scheduled || []).map((post) => ({
          id: post.id,
          type: 'scheduled' as const,
          thumbnail: extractThumb(post),
          caption: post.caption,
          createdAt: post.created_at || '',
          scheduledDate: post.scheduled_date,
          route: `/review/${post.id}`,
        }));

        const draftItems: PendingItem[] = (drafts || []).map((draft) => {
          let thumbnail: string | null = null;
          if (draft.media_urls && Array.isArray(draft.media_urls) && draft.media_urls.length > 0) {
            const firstUrl = draft.media_urls[0];
            if (typeof firstUrl === 'string') {
              thumbnail = firstUrl;
            } else if (firstUrl && typeof firstUrl === 'object') {
              thumbnail = (firstUrl as { url?: string }).url || null;
            }
          }
          return {
            id: draft.id,
            type: 'draft' as const,
            thumbnail,
            caption: draft.caption,
            createdAt: draft.created_at,
            route: `/drafts`,
          };
        });

        // Ordem: primeiro Por Aprovar (mais urgente), depois Agendados, depois Rascunhos
        const approvalSorted = [...storyItems, ...postItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const scheduledSorted = scheduledItems.sort(
          (a, b) => new Date(a.scheduledDate || a.createdAt).getTime() - new Date(b.scheduledDate || b.createdAt).getTime()
        );
        const draftsSorted = draftItems.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const allItems = [...approvalSorted, ...scheduledSorted, ...draftsSorted].slice(0, limit);

        const approvalCount = (stories?.length || 0) + (posts?.length || 0);
        const scheduledTotal = scheduled?.length || 0;
        const draftsTotal = drafts?.length || 0;
        const total = approvalCount + scheduledTotal + draftsTotal;

        setItems(allItems);
        setTotalCount(total);
        setPendingApprovalCount(approvalCount);
        setScheduledCount(scheduledTotal);
        setDraftsCount(draftsTotal);
      } catch (error) {
        console.error('Error fetching pending content:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPendingContent();

    const storiesChannel = supabase
      .channel('pending-stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, fetchPendingContent)
      .subscribe();

    const postsChannel = supabase
      .channel('pending-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPendingContent)
      .subscribe();

    const draftsChannel = supabase
      .channel('pending-drafts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts_drafts' }, fetchPendingContent)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(draftsChannel);
    };
  }, [limit]);

  return { items, totalCount, pendingApprovalCount, draftsCount, scheduledCount, loading };
}
