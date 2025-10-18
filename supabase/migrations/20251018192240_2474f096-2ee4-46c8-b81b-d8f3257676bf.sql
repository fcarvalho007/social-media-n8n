-- Fix the search_path for the update_reviewed_at function
create or replace function public.update_reviewed_at()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if new.status != old.status and new.status in ('approved', 'rejected') then
    new.reviewed_at = now();
  end if;
  return new;
end;
$$;