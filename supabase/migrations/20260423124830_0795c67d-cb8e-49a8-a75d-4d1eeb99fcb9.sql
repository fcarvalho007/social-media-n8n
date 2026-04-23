
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Service role creates notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert publication attempts" ON public.publication_attempts;
DROP POLICY IF EXISTS "System can update publication attempts" ON public.publication_attempts;

CREATE POLICY "Service role inserts publication attempts"
  ON public.publication_attempts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates publication attempts"
  ON public.publication_attempts FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "System can manage all scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "Service role manages scheduled jobs"
  ON public.scheduled_jobs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
