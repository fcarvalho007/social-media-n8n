with t as (
  select c.oid, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and (c.relname like 'nl\_%' or c.relname like 'estudio\_%' or c.relname='art_rascunhos')
)
select 1 as ord, relname as k, 'CREATE TABLE IF NOT EXISTS public.'||quote_ident(relname)||' ('||E'\n'||
  string_agg('  '||quote_ident(a.attname)||' '||format_type(a.atttypid,a.atttypmod)||
   case when a.attgenerated='s' then ' GENERATED ALWAYS AS ('||pg_get_expr(d.adbin,d.adrelid)||') STORED' else coalesce(' DEFAULT '||pg_get_expr(d.adbin,d.adrelid),'') end||case when a.attidentity in ('a','d') then ' GENERATED '||case a.attidentity when 'a' then 'ALWAYS' else 'BY DEFAULT' end||' AS IDENTITY' else '' end||case when a.attnotnull then ' NOT NULL' else '' end, E',\n' order by a.attnum)||E'\n);' as ddl
from t join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
left join pg_attrdef d on d.adrelid=t.oid and d.adnum=a.attnum group by relname
union all
select case when con.contype='f' then 3 else 2 end, t.relname||con.conname,
 'DO $$ BEGIN ALTER TABLE public.'||quote_ident(t.relname)||' ADD CONSTRAINT '||quote_ident(con.conname)||' '||pg_get_constraintdef(con.oid)||'; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;'
from t join pg_constraint con on con.conrelid=t.oid
union all
select 4, i.indexname, replace(replace(i.indexdef,'CREATE INDEX ','CREATE INDEX IF NOT EXISTS '),'CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ')||';'
from pg_indexes i join t on t.relname=i.tablename where i.schemaname='public'
 and not exists (select 1 from pg_constraint c where c.conname=i.indexname)
union all
select 0, p.proname||p.oid, pg_get_functiondef(p.oid)||';'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nl\_%'
union all
select 6, t.relname, 'ALTER TABLE public.'||quote_ident(t.relname)||' ENABLE ROW LEVEL SECURITY;' from t join pg_class c on c.oid=t.oid where c.relrowsecurity
union all
select 7, tg.tgname, 'DROP TRIGGER IF EXISTS '||quote_ident(tg.tgname)||' ON public.'||quote_ident(t.relname)||'; '||pg_get_triggerdef(tg.oid)||';'
from t join pg_trigger tg on tg.tgrelid=t.oid and not tg.tgisinternal
union all
select 8, p.tablename||p.policyname, 'DROP POLICY IF EXISTS '||quote_ident(p.policyname)||' ON public.'||quote_ident(p.tablename)||'; CREATE POLICY '||quote_ident(p.policyname)||' ON public.'||quote_ident(p.tablename)||
 ' AS '||p.permissive||' FOR '||p.cmd||' TO '||array_to_string(p.roles,', ')||coalesce(' USING ('||p.qual||')','')||coalesce(' WITH CHECK ('||p.with_check||')','')||';'
from pg_policies p join t on t.relname=p.tablename where p.schemaname='public'
union all
select 9, t.relname||x.grantee::regrole::text, 'GRANT '||string_agg(distinct x.privilege_type,', ')||' ON public.'||quote_ident(t.relname)||' TO '||x.grantee::regrole::text||';'
from t join pg_class c on c.oid=t.oid cross join lateral aclexplode(c.relacl) x
where x.grantee in (select oid from pg_roles where rolname in ('anon','authenticated','service_role')) group by t.relname, x.grantee
union all
select 10, p.proname||r.rolname, 'REVOKE ALL ON FUNCTION '||p.oid::regprocedure||' FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION '||p.oid::regprocedure||' TO '||r.rolname||';'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_roles r
where n.nspname='public' and p.proname like 'nl\_%' and r.rolname in ('authenticated','service_role') and has_function_privilege(r.rolname,p.oid,'EXECUTE')
union all
select 11, b.id, 'INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('||quote_literal(b.id)||','||quote_literal(b.name)||','||b.public||','||coalesce(b.file_size_limit::text,'NULL')||','||coalesce(quote_literal(b.allowed_mime_types::text)||'::text[]','NULL')||') ON CONFLICT (id) DO NOTHING;'
from storage.buckets b where b.id like 'nl-%'
union all
select 12, p.policyname, 'DROP POLICY IF EXISTS '||quote_ident(p.policyname)||' ON storage.objects; CREATE POLICY '||quote_ident(p.policyname)||' ON storage.objects AS '||p.permissive||' FOR '||p.cmd||' TO '||array_to_string(p.roles,', ')||coalesce(' USING ('||p.qual||')','')||coalesce(' WITH CHECK ('||p.with_check||')','')||';'
from pg_policies p where p.schemaname='storage' and p.tablename='objects' and (coalesce(p.qual,'')||coalesce(p.with_check,'')) like '%nl-%'
union all
select -1, e.extname, 'CREATE EXTENSION IF NOT EXISTS '||quote_ident(e.extname)||' WITH SCHEMA '||n.nspname||';' from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname in ('pg_trgm','unaccent','vector')
order by 1,2
