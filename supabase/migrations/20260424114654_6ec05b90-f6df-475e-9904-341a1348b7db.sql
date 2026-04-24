CREATE INDEX IF NOT EXISTS idx_post_metrics_raw_hourly_lookup
ON public.post_metrics_raw (post_id, network, date_trunc('hour', captured_at AT TIME ZONE 'UTC'));

CREATE OR REPLACE FUNCTION public.update_account_insight_visibility(
  _insight_id uuid,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_dismissed_count integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão obrigatória';
  END IF;

  IF _action NOT IN ('dismiss', 'mute') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  SELECT dismissed_count
  INTO v_dismissed_count
  FROM public.account_insights
  WHERE id = _insight_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insight não encontrado';
  END IF;

  IF _action = 'mute' THEN
    UPDATE public.account_insights
    SET never_show = true,
        last_updated = now()
    WHERE id = _insight_id
      AND user_id = v_user_id;
  ELSE
    v_dismissed_count := COALESCE(v_dismissed_count, 0) + 1;

    UPDATE public.account_insights
    SET dismissed_count = v_dismissed_count,
        dismissed_until = CASE
          WHEN v_dismissed_count >= 3 THEN now() + interval '30 days'
          ELSE dismissed_until
        END,
        last_updated = now()
    WHERE id = _insight_id
      AND user_id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_account_insight_visibility(uuid, text) TO authenticated;