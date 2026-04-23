

## Plano de Segurança — corrigir 9 findings sem quebrar funcionalidades

### Resumo dos riscos

| # | Finding | Severidade | Impacto funcional do fix |
|---|---|---|---|
| 1 | E-mails de utilizadores expostos publicamente (`profiles`) | 🔴 Erro | Nenhum — frontend só lê `id`, `full_name`, `avatar_url` |
| 2 | Tokens OAuth de redes sociais expostos (`social_profiles`) | 🔴 Erro | Nenhum — edge functions usam service-role |
| 3 | `idempotency_keys` com policy `USING (true)` | 🟡 Aviso | Nenhum — só edge functions escrevem (service-role bypass RLS) |
| 4 | ~28 policies `public_*` com `USING (true)` em posts/projects/tasks/etc. | 🟡 Aviso | Nenhum — policies user-scoped já cobrem o fluxo real |
| 5 | Extensão no schema `public` | 🟡 Aviso | Nenhum |
| 6 | Leaked Password Protection desligado | 🟡 Aviso | Nenhum — projecto usa passwordless (não há signup com password) |
| 7-9 | Vulnerabilidades em dependências (crit/high/medium) | 🔴/🟡/ℹ️ | A confirmar com `bun audit` local — algumas exigem `bun update` |

---

### Fase 1 — RLS crítico (`profiles` + `social_profiles`)

**1.1 `profiles` — esconder e-mails de anónimos.**

Substituir a policy "Users can view all profiles" (`USING true`, role `public`) por duas policies authenticated-only:

```sql
DROP POLICY "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profile basics"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);  -- ainda permite ver outros utilizadores (necessário para assignees)
```

Adicionalmente, alterar `useProfiles.ts` para usar `select('id, full_name, avatar_url')` em vez de `select('*')` — defesa em profundidade. O e-mail só é lido em `UserManagement` (admin-only) e na UI do próprio user.

Resultado: anónimos deixam de poder fazer scrape de e-mails; o picker de assignees, avatars e UserManagement continuam a funcionar.

**1.2 `social_profiles` — não devolver tokens ao browser.**

Alterar `ProfileSelector.tsx` para `select('id, network, profile_name, profile_handle, profile_image_url, connection_status, token_expires_at, profile_metadata, user_id, created_at, updated_at')` — explicitamente sem `access_token` nem `refresh_token`. Adicionalmente, criar uma view `public.social_profiles_safe` exposta sem as colunas sensíveis e revogar SELECT directo aos campos token.

A RLS já está correta (`auth.uid() = user_id`); este fix é **defesa em profundidade** caso outro código futuro faça `select('*')`.

### Fase 2 — Limpeza de policies `public_*` (~28 redundantes)

Tabelas afectadas: `posts`, `posts_drafts`, `projects`, `tasks`, `task_dependencies`, `task_milestones`, `milestones`, `stories`.

Cada uma destas tabelas tem **dois conjuntos de policies**:
- Conjunto A — user-scoped correto (`auth.uid() = user_id`, etc.)
- Conjunto B — `public_read_*` / `public_insert_*` / `public_update_*` / `public_delete_*` com `USING (true)` para role `public` (anon + authenticated)

O conjunto B foi adicionado para debug e neutraliza completamente o A. **Remover apenas o conjunto B**. Todas as queries do frontend já usam sessão autenticada e o conjunto A cobre o fluxo real (verificado em `useProjects`, `useTasks`, `usePosts`, etc.).

```sql
-- Exemplo (repete-se para cada tabela acima)
DROP POLICY IF EXISTS public_read_posts ON public.posts;
DROP POLICY IF EXISTS public_delete_posts ON public.posts;
DROP POLICY IF EXISTS debug_allow_all ON public.posts;
-- ... etc
```

### Fase 3 — `idempotency_keys` restrito a service-role

```sql
DROP POLICY "Service role full access" ON public.idempotency_keys;

CREATE POLICY "Service role only - read"
  ON public.idempotency_keys FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role only - write"
  ON public.idempotency_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

Edge functions já usam `SUPABASE_SERVICE_ROLE_KEY` e `service_role` bypassa RLS para writes; mantemos a policy explícita por clareza. `anon` e `authenticated` perdem qualquer acesso — não há código frontend que toque na tabela.

### Fase 4 — Auth & Schema housekeeping

**4.1 Leaked Password Protection.** Ativar via `configure_auth({ password_hibp_enabled: true })`. Sem impacto: o projecto usa magic-link (passwordless) para a whitelist `comunicacao@fredericocarvalho.pt` etc.

**4.2 Extension in Public.** Migrar a extensão (provavelmente `pg_net` ou `pg_cron`) do schema `public` para `extensions`:
```sql
ALTER EXTENSION pg_net SET SCHEMA extensions;
```
(Sem alterações de código — funções qualificam-se na ligação.)

**4.3 Public Bucket Listing (4 ocorrências).** Os buckets `pdfs`, `post-covers`, `ai-generated-images`, `publications` estão `public`. O scanner avisa que qualquer um pode listar **nomes** de ficheiros (não acede ao conteúdo se não tiver URL). Como os ficheiros são partilhados por URL público (links em IG/LI), restringir LIST à `authenticated` mantém URLs directos a funcionar:

```sql
CREATE POLICY "Authenticated list only" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('pdfs','post-covers','ai-generated-images','publications'));
DROP POLICY <existing public list policy> ON storage.objects;
```
Ou então documentar como aceitável (ficheiros já são intencionalmente públicos via URL). **Recomendação:** restringir LIST mas manter GET público.

### Fase 5 — Dependências vulneráveis

`bun audit` / `npm audit` não funcionam no sandbox (registry privado retorna 404). Plano:

5.1. Identificar dependências com CVEs conhecidos no `package.json` actual via `npm view <pkg>` direcionado (alvos prováveis: `vite`, `esbuild`, `path-to-regexp`, `axios`, `cookie`).
5.2. Correr `bun update <pacote>` para minor/patch bumps que **não** sejam major.
5.3. Para majors com breaking changes (ex: `vite 5 → 6`), **não actualizar** sem migração dedicada.
5.4. Após a Fase 5, listar resultado e marcar findings como `mark_as_fixed` ou `update_details`.

---

### Plano de execução

1. **Migração SQL** (Fases 1-4): uma única migração consolidada com `BEGIN/COMMIT`. Aprovação automática via tool de migrações.
2. **Edits frontend** (Fase 1.1, 1.2): `useProfiles.ts`, `ProfileSelector.tsx`.
3. **`configure_auth`** para HIBP (Fase 4.1).
4. **Updates de dependências** (Fase 5) — separado, com `add_dependency` direcionado.
5. **Re-scan** com `security--run_security_scan` + `mark_as_fixed` para os internal_ids resolvidos.

### Checkpoint

☐ Policy `Users can view all profiles` substituída — anónimos não veem profiles  
☐ `useProfiles` selecciona apenas colunas seguras  
☐ `ProfileSelector` selecciona apenas colunas não-sensíveis de `social_profiles`  
☐ Policy `Service role full access` em `idempotency_keys` restrita a `service_role`  
☐ ~28 policies `public_*` e `debug_allow_all` removidas  
☐ Extensão movida para schema `extensions`  
☐ HIBP password protection ligado  
☐ Buckets storage com LIST restrito a `authenticated`  
☐ Dependências críticas/high actualizadas (minor/patch)  
☐ `bun run build:dev` passa  
☐ Testes Vitest 14/14 verdes  
☐ `tsc --noEmit` 0 erros  
☐ Re-scan de segurança: 0 críticos, ≤2 avisos restantes  
☐ Funcionalidades validadas: criar post, ver assignees, publicar IG/LI, agendar, recuperar rascunho

### Fora do escopo

- Encriptação at-rest dos tokens OAuth (requer infra Vault/PGSodium)
- 2FA para o painel admin
- Auditoria de ataque a edge functions (rate-limiting, JWT validation pormenorizada)
- Rotação automática de tokens expirados (já existe `token_expires_at` mas refresh manual)

