-- Create posts table for Instagram content approval
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  
  -- Workflow metadata
  workflow_id text not null,
  source text,
  
  -- Content
  tema text not null,
  caption text not null,
  hashtags text[] default array[]::text[],
  
  -- Template A (Purple/Blue)
  template_a_images text[] not null,
  template_a_metadata jsonb,
  
  -- Template B (Black/Gold)
  template_b_images text[] not null,
  template_b_metadata jsonb,
  
  -- Approval state
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  selected_template text check (selected_template in ('A', 'B')),
  
  -- Edits
  caption_edited text,
  hashtags_edited text[],
  notes text,
  
  -- Timestamps
  reviewed_at timestamp with time zone,
  published_at timestamp with time zone,
  
  -- User
  reviewed_by uuid references auth.users(id)
);

-- Create indexes for better query performance
create index idx_posts_status on public.posts(status);
create index idx_posts_created on public.posts(created_at desc);
create index idx_posts_workflow_id on public.posts(workflow_id);

-- Enable Row Level Security
alter table public.posts enable row level security;

-- RLS Policy: Allow authenticated users to view all posts
create policy "Authenticated users can view all posts"
on public.posts
for select
to authenticated
using (true);

-- RLS Policy: Allow authenticated users to update posts
create policy "Authenticated users can update posts"
on public.posts
for update
to authenticated
using (true)
with check (true);

-- RLS Policy: Allow service role to insert posts (for webhooks)
create policy "Service role can insert posts"
on public.posts
for insert
to service_role
with check (true);

-- Create function to update reviewed_at timestamp
create or replace function public.update_reviewed_at()
returns trigger as $$
begin
  if new.status != old.status and new.status in ('approved', 'rejected') then
    new.reviewed_at = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for automatic timestamp updates
create trigger update_posts_reviewed_at
before update on public.posts
for each row
execute function public.update_reviewed_at();

-- Enable realtime for posts table
alter publication supabase_realtime add table public.posts;