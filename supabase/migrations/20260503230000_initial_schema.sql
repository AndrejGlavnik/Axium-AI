-- Analytics AI Platform initial schema.
-- Run this in Supabase SQL editor or with `supabase db push`.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  openai_vector_store_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size >= 0),
  storage_path text not null,
  openai_file_id text,
  vector_store_id text,
  status text not null default 'stored' check (status in ('stored', 'indexing', 'ready', 'failed', 'openai_skipped')),
  created_at timestamptz not null default now()
);

create table if not exists public.file_schemas (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  columns jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  sample_rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (file_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  run_type text not null,
  parameters jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_files_workspace_id on public.files(workspace_id);
create index if not exists idx_file_schemas_workspace_id on public.file_schemas(workspace_id);
create index if not exists idx_chat_threads_workspace_id on public.chat_threads(workspace_id);
create index if not exists idx_chat_messages_workspace_thread on public.chat_messages(workspace_id, thread_id, created_at);
create index if not exists idx_analysis_runs_workspace_id on public.analysis_runs(workspace_id);

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_chat_threads_updated_at on public.chat_threads;
create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_workspace_member(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = target_user_id
  );
$$;

-- RLS should remain enabled for all tenant-scoped tables even though this MVP
-- performs database writes through authenticated server API routes.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.files enable row level security;
alter table public.file_schemas enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.analysis_runs enable row level security;

comment on table public.workspaces is 'RLS enabled. Access requires membership through workspace_members.';
comment on table public.files is 'RLS enabled. Every application query must filter by workspace_id.';
comment on table public.chat_messages is 'RLS enabled. Messages are isolated by workspace_id and thread_id.';
comment on table public.analysis_runs is 'RLS enabled. Analysis outputs are tenant-scoped by workspace_id.';

create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Members can read workspaces"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id, auth.uid()));

create policy "Users can create owned workspaces"
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update workspaces"
on public.workspaces for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Members can read workspace members"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Owners can manage workspace members"
on public.workspace_members for all
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

create policy "Members can read files"
on public.files for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert files"
on public.files for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and uploaded_by = auth.uid());

create policy "Members can read file schemas"
on public.file_schemas for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert file schemas"
on public.file_schemas for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read chat threads"
on public.chat_threads for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can create chat threads"
on public.chat_threads for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update chat threads"
on public.chat_threads for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read chat messages"
on public.chat_messages for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert chat messages"
on public.chat_messages for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read analysis runs"
on public.analysis_runs for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert analysis runs"
on public.analysis_runs for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-files',
  'workspace-files',
  false,
  26214400,
  array[
    'text/csv',
    'text/plain',
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can read storage objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

create policy "Members can upload storage objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

create policy "Members can update storage objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
)
with check (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

create policy "Members can delete storage objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
