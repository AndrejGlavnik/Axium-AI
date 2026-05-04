-- Workspace-scoped source connections for Axium.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 180),
  provider text not null default 'API' check (provider in (
    'Datorama',
    'Databox',
    'GA4',
    'BigQuery',
    'Google Sheets',
    'Excel',
    'CSV',
    'S3',
    'API',
    'Manual',
    'Other'
  )),
  connection_type text not null default 'api_key' check (connection_type in (
    'oauth',
    'api_key',
    'service_account',
    'warehouse',
    'sheet',
    'file_export',
    'dashboard',
    'manual',
    'other'
  )),
  auth_type text not null default 'api_key' check (auth_type in (
    'none',
    'api_key',
    'bearer_token',
    'basic',
    'oauth2',
    'service_account',
    'custom'
  )),
  status text not null default 'draft' check (status in (
    'draft',
    'needs_credentials',
    'connected',
    'error',
    'paused',
    'archived'
  )),
  base_url text,
  account_identifier text,
  documentation_url text,
  description text,
  owner text,
  sync_frequency text not null default 'manual' check (sync_frequency in ('manual', 'hourly', 'daily', 'weekly', 'monthly', 'unknown')),
  scopes text[] not null default '{}',
  linked_asset_ids uuid[] not null default '{}',
  has_credentials boolean not null default false,
  last_sync_at timestamptz,
  last_tested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connection_secrets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  secret_label text not null default 'Connection credential',
  secret_hint text,
  encrypted_payload text not null,
  secret_iv text not null,
  secret_tag text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_connections_workspace_id on public.connections(workspace_id);
create index if not exists idx_connections_status on public.connections(workspace_id, status);
create index if not exists idx_connections_provider on public.connections(workspace_id, provider);
create index if not exists idx_connection_secrets_connection_id on public.connection_secrets(connection_id);
create index if not exists idx_connection_secrets_workspace_id on public.connection_secrets(workspace_id);

drop trigger if exists set_connections_updated_at on public.connections;
create trigger set_connections_updated_at
before update on public.connections
for each row execute function public.set_updated_at();

drop trigger if exists set_connection_secrets_updated_at on public.connection_secrets;
create trigger set_connection_secrets_updated_at
before update on public.connection_secrets
for each row execute function public.set_updated_at();

alter table public.connections enable row level security;
alter table public.connection_secrets enable row level security;

comment on table public.connections is 'RLS enabled. Connections are isolated by workspace_id and may be read by workspace members.';
comment on table public.connection_secrets is 'RLS enabled with no client read policy. Secrets are written/read only by server routes through the service role and encrypted by the app.';

create policy "Members can read connections"
on public.connections for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Writers can insert connections"
on public.connections for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Writers can update connections"
on public.connections for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

create policy "Writers can delete connections"
on public.connections for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

-- Intentionally no select policy for connection_secrets.
-- Server API routes use Supabase service role and never return secret payloads to the browser.
create policy "Writers can insert connection secrets"
on public.connection_secrets for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());
