## Plano: RLS de IA + tabela `user_hashtag_history`

Vou separar isto em duas partes: (1) confirmar/normalizar as policies de `user_ai_credits` e `ai_usage_log`; (2) criar apenas a estrutura da nova tabela `user_hashtag_history`, sem implementar funcionalidade no frontend ainda.

## SQL proposto para validação

### 1. `user_ai_credits`

Objetivo: o utilizador autenticado só pode ler os próprios créditos. Não pode inserir, alterar ou apagar créditos diretamente. A escrita fica limitada ao backend através de `service_role` e das funções backend existentes.

```sql
ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_credits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Service role manages AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can insert their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can update their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can delete their own AI credits" ON public.user_ai_credits;

CREATE POLICY "Users can view their own AI credits"
ON public.user_ai_credits
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages AI credits"
ON public.user_ai_credits
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

Notas de segurança:
- Não será criada nenhuma policy de `INSERT`, `UPDATE` ou `DELETE` para `authenticated`.
- Como RLS bloqueia por defeito tudo o que não está permitido, o utilizador não consegue alterar créditos diretamente.
- `PERMISSIVE` aqui é seguro porque só existe uma policy de leitura para `authenticated`; não há uma segunda policy permissiva que alargue escrita ao utilizador.
- `FORCE ROW LEVEL SECURITY` reforça que o acesso passa pelas policies, mantendo o `service_role` como canal de gestão backend.

### 2. `ai_usage_log`

Objetivo: o utilizador autenticado só pode ler os próprios logs. Não pode criar/alterar/apagar logs diretamente. A escrita fica limitada ao backend via `service_role`/funções.

```sql
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Service role manages AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can insert their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can update their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can delete their own AI usage log" ON public.ai_usage_log;

CREATE POLICY "Users can view their own AI usage log"
ON public.ai_usage_log
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages AI usage log"
ON public.ai_usage_log
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

Notas de segurança:
- O frontend pode consultar apenas logs do próprio utilizador.
- Não há policies de escrita para `authenticated`.
- A função backend `log_ai_usage(...)` continua a poder gravar logs porque é executada como fluxo backend/definer, não por mutação direta do cliente.
- Não será usada policy `TO public` para evitar expor dados a sessões anónimas.

### 3. Nova tabela `user_hashtag_history`

Objetivo: preparar dados reais para uma futura categoria “As tuas mais usadas”, sem providers externos pagos.

```sql
CREATE TABLE IF NOT EXISTS public.user_hashtag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hashtag text NOT NULL,
  times_used integer NOT NULL DEFAULT 1,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_hashtag_history_unique_user_hashtag UNIQUE (user_id, hashtag),
  CONSTRAINT user_hashtag_history_hashtag_not_blank CHECK (length(trim(hashtag)) > 0),
  CONSTRAINT user_hashtag_history_times_used_positive CHECK (times_used > 0)
);

ALTER TABLE public.user_hashtag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hashtag_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can create their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can update their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can delete their own hashtag history" ON public.user_hashtag_history;

CREATE POLICY "Users can view their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_hashtag_history_user_last_used
ON public.user_hashtag_history(user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_hashtag_history_user_times_used
ON public.user_hashtag_history(user_id, times_used DESC, last_used_at DESC);

DROP TRIGGER IF EXISTS update_user_hashtag_history_updated_at ON public.user_hashtag_history;
CREATE TRIGGER update_user_hashtag_history_updated_at
BEFORE UPDATE ON public.user_hashtag_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

Nota: para `user_hashtag_history`, vou permitir `SELECT/INSERT/UPDATE/DELETE` ao próprio utilizador porque o teu requisito diz “só o próprio utilizador vê/modifica os seus dados”. Isto é diferente de `user_ai_credits`, onde a escrita direta fica bloqueada.

## Implementação após aprovação

1. Criar uma migração com o SQL acima.
2. Não alterar `src/integrations/supabase/types.ts` nem ficheiros bloqueados.
3. Não implementar ainda leitura/escrita de `user_hashtag_history` no frontend; fica apenas preparado para o Prompt 2.
4. Se necessário, atualizar `DESIGN_SYSTEM.md` ou documentação técnica apenas para mencionar que a categoria futura “As tuas mais usadas” terá dados próprios, sem providers externos.
5. Validar que não foram introduzidas policies permissivas de escrita em `user_ai_credits` ou `ai_usage_log` para utilizadores autenticados.

## Checklist

☐ Validar contigo o SQL das RLS policies antes de executar migração.
☐ Aplicar migração apenas depois de aprovação explícita.
☐ Garantir leitura própria em `user_ai_credits` e `ai_usage_log`.
☐ Garantir escrita direta bloqueada em `user_ai_credits` e `ai_usage_log` para utilizadores.
☐ Criar `user_hashtag_history` com RLS por `auth.uid() = user_id`.
☐ Não implementar funcionalidade de hashtags ainda.