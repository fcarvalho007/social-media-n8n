import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AiPreferences } from '@/types/aiEditorial';
import type { TablesInsert } from '@/integrations/supabase/types';

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
const campos = 'preferred_language,default_tone,preferred_model,brand_hashtags,insights_enabled,auto_alt_text,auto_first_comment,muted_insight_types,dismissed_insights';
const mensagemErro = (e: unknown) => e instanceof Error ? e.message : (e as { message?: string })?.message || 'Não foi possível guardar. Tenta de novo.';

export function useAiPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [preferences, setPreferences] = useState<AiPreferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const contaAtual = useRef(userId); contaAtual.current = userId;
  const carregadaPara = useRef<string | null>(null);
  const preferenciasAtuais = useRef(preferences);
  const hashtagsGuardadas = useRef<string[]>([]);
  const preferenciasExistem = useRef(false);
  const gravacaoEmCurso = useRef(false);
  const reload = useCallback(() => setTentativa((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    carregadaPara.current = null;
    setLoading(true); setError(null);
    async function load() {
      try {
        if (!userId) throw new Error('Sessão em falta. Volta a entrar.');
        const [preferencias, marcas] = await Promise.all([
          supabase.from('ai_preferences').select(campos).eq('user_id', userId).maybeSingle(),
          supabase.from('user_brand_hashtags').select('hashtag').eq('user_id', userId),
        ]);
        if (preferencias.error) throw preferencias.error;
        if (marcas.error) throw marcas.error;
        const tags = ((marcas.data as unknown as Array<{ hashtag: string }> | null) ?? []).map((row) => row.hashtag);
        // The preferences row is canonical; old hashtag-only accounts retain their existing tags.
        const dados = preferencias.data as unknown as Partial<AiPreferences> | null;
        const next = { ...defaults, ...dados, brand_hashtags: dados?.brand_hashtags ?? tags.slice(0, 5) };
        if (!cancelled) {
          carregadaPara.current = userId;
          hashtagsGuardadas.current = tags;
          preferenciasExistem.current = !!dados;
          preferenciasAtuais.current = next;
          setPreferences(next);
        }
      } catch (e) {
        if (!cancelled) setError(`Não foi possível carregar as preferências. ${mensagemErro(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId, tentativa]);

  const savePreferences = async (patch: Partial<AiPreferences>) => {
    if (gravacaoEmCurso.current) throw new Error('Ainda a guardar a alteração anterior.');
    if (!userId || carregadaPara.current !== userId) throw new Error('Carrega as preferências antes de guardar.');
    gravacaoEmCurso.current = true; setSaving(true);
    const next = { ...preferenciasAtuais.current, ...patch };
    const tags = Array.from(new Set(next.brand_hashtags)).slice(0, 5);
    const camposAlterados = { ...patch, ...(patch.brand_hashtags ? { brand_hashtags: tags } : {}) };
    try {
      if (patch.brand_hashtags) {
        // Add replacements first. A failed insert must never delete the previous set.
        const novas = tags.filter((tag) => !hashtagsGuardadas.current.includes(tag));
        if (novas.length) {
          const r = await supabase.from('user_brand_hashtags')
            .upsert(novas.map((hashtag) => ({ user_id: userId, hashtag })), { onConflict: 'user_id,hashtag', ignoreDuplicates: true });
          if (r.error) throw r.error;
        }
      }
      // Write only changed fields, preserving preferences saved by another surface.
      const r = await supabase.from('ai_preferences').upsert({ user_id: userId, ...(!preferenciasExistem.current ? preferenciasAtuais.current : {}), ...camposAlterados } as TablesInsert<'ai_preferences'>, { onConflict: 'user_id' }).select(campos).single();
      if (r.error) throw r.error;
      if (!r.data) throw new Error('O servidor não confirmou a gravação.');
      if (patch.brand_hashtags) {
        const antigas = hashtagsGuardadas.current.filter((tag) => !tags.includes(tag));
        if (antigas.length) {
          const removidas = await supabase.from('user_brand_hashtags').delete().eq('user_id', userId).in('hashtag', antigas);
          if (removidas.error) throw removidas.error;
        }
      }
      if (contaAtual.current !== userId) throw new Error('A conta mudou durante a gravação.');
      const confirmadas = { ...defaults, ...(r.data as unknown as Partial<AiPreferences>) };
      preferenciasExistem.current = true;
      preferenciasAtuais.current = confirmadas;
      hashtagsGuardadas.current = patch.brand_hashtags ? tags : hashtagsGuardadas.current;
      setPreferences(confirmadas); setError(null);
    } catch (e) {
      // Separate writes may have partially completed. Keep the last visible copy and require a fresh read.
      if (contaAtual.current === userId) {
        carregadaPara.current = null;
        setError(`A gravação não foi concluída. Recarrega as preferências antes de tentar de novo. ${mensagemErro(e)}`);
      }
      throw new Error(mensagemErro(e));
    } finally {
      gravacaoEmCurso.current = false;
      setSaving(false);
    }
  };

  return { preferences, loading, saving, error, reload, savePreferences };
}
