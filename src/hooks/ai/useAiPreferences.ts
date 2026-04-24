import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AiPreferences } from '@/types/aiEditorial';

const defaults: AiPreferences = {
  preferred_language: 'pt-PT',
  default_tone: 'neutro',
  preferred_model: 'fast',
  brand_hashtags: [],
  insights_enabled: true,
  auto_alt_text: false,
  auto_first_comment: false,
  muted_insight_types: [],
  dismissed_insights: {},
};

export function useAiPreferences() {
  const [preferences, setPreferences] = useState<AiPreferences>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [{ data }, { data: brandRows }] = await Promise.all([
        supabase.from('ai_preferences' as any).select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_brand_hashtags' as any).select('hashtag').eq('user_id', user.id).limit(5),
      ]);
      if (!cancelled && data) {
        setPreferences({ ...defaults, ...(data as any), brand_hashtags: (brandRows as any[] | null)?.map(row => row.hashtag) ?? (data as any).brand_hashtags ?? [] });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const savePreferences = async (patch: Partial<AiPreferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    await supabase.from('ai_preferences' as any).upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
    if (patch.brand_hashtags) {
      await supabase.from('user_brand_hashtags' as any).delete().eq('user_id', user.id);
      if (patch.brand_hashtags.length > 0) {
        await supabase.from('user_brand_hashtags' as any).insert(patch.brand_hashtags.slice(0, 5).map((hashtag) => ({ user_id: user.id, hashtag })));
      }
    }
  };

  return { preferences, loading, savePreferences };
}
