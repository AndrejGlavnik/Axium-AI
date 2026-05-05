-- Discovered or manually documented resources inside a workspace connection.

create table if not exists public.connection_resources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  resource_name text not null check (char_length(resource_name) between 1 and 220),
  resource_type text not null default 'other' check (resource_type in (
    'account',
    'property',
    'dataset',
    'table',
    'dashboard',
    'report',
    'sheet',
    'api_endpoint',
    'file_export',
    'metric',
    'field',
    'linked_asset',
    'other'
  )),
  external_id text,
  path text,
  description text,
  schema_summary jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'under_review', 'unavailable', 'deprecated', 'archived')),
  linked_asset_id uuid references public.data_assets(id) on delete set null,
  discovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, connection_id, resource_name, resource_type)
);

create index if not exists idx_connection_resources_workspace_id on public.connection_resources(workspace_id);
create index if not exists idx_connection_resources_connection_id on public.connection_resources(connection_id);
create index if not exists idx_connection_resources_asset_id on public.connection_resources(linked_asset_id);

drop trigger if exists set_connection_resources_updated_at on public.connection_resources;
create trigger set_connection_resources_updated_at
before update on public.connection_resources
for each row execute function public.set_updated_at();

alter table public.connection_resources enable row level security;

comment on table public.connection_resources is 'RLS enabled. Resources discovered or documented inside each workspace connection.';

create policy "Members can read connection resources"
on public.connection_resources for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Writers can insert connection resources"
on public.connection_resources for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Writers can update connection resources"
on public.connection_resources for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

create policy "Writers can delete connection resources"
on public.connection_resources for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));
