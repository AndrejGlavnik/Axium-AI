-- Axium Knowledge extension.
-- Run after 20260503230000_initial_schema.sql.

-- Workspace roles are intentionally simple for the MVP.
update public.workspace_members
set role = 'analyst'
where role = 'member';

alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.workspace_members
  add constraint workspace_members_role_check check (role in ('owner', 'admin', 'analyst', 'viewer'));
alter table public.workspace_members alter column role set default 'analyst';

alter table public.files add column if not exists updated_at timestamptz not null default now();

alter table public.file_schemas add column if not exists detected_columns text[] not null default '{}';
alter table public.file_schemas add column if not exists detected_date_columns text[] not null default '{}';
alter table public.file_schemas add column if not exists detected_metric_columns text[] not null default '{}';
alter table public.file_schemas add column if not exists detected_dimension_columns text[] not null default '{}';
alter table public.file_schemas add column if not exists updated_at timestamptz not null default now();

alter table public.chat_threads add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.chat_threads set user_id = created_by where user_id is null;
alter table public.chat_threads alter column user_id set not null;

alter table public.analysis_runs add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.analysis_runs add column if not exists question text;
alter table public.analysis_runs add column if not exists files_used jsonb not null default '[]'::jsonb;
alter table public.analysis_runs add column if not exists knowledge_used jsonb not null default '[]'::jsonb;
alter table public.analysis_runs add column if not exists output_type text;
update public.analysis_runs set user_id = created_by where user_id is null;

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  type text not null default 'Data Source Explanation' check (type in (
    'Metric Definition',
    'Data Source Explanation',
    'Dashboard Explanation',
    'Data Quality Issue',
    'Incident',
    'Root Cause',
    'Connection Change',
    'Tracking Change',
    'Business Rule',
    'Manual Adjustment',
    'Known Limitation',
    'Resolved Issue',
    'Open Issue',
    'Recommendation'
  )),
  description text not null,
  affected_system text,
  affected_dashboard text,
  affected_metric text,
  affected_date_start date,
  affected_date_end date,
  root_cause text,
  business_impact text,
  recommended_action text,
  status text not null default 'active' check (status in ('draft', 'active', 'open', 'resolved', 'deprecated')),
  confidence_level text not null default 'medium' check (confidence_level in ('low', 'medium', 'high', 'confirmed')),
  tags text[] not null default '{}',
  source_file_id uuid references public.files(id) on delete set null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  asset_name text not null check (char_length(asset_name) between 2 and 180),
  asset_type text not null default 'dataset' check (asset_type in (
    'data_source',
    'dataset',
    'data_stream',
    'dashboard',
    'report',
    'table',
    'file',
    'api_connection',
    'manual_upload',
    'metric_layer',
    'other'
  )),
  source_platform text not null default 'Other' check (source_platform in (
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
  description text,
  owner text,
  refresh_frequency text,
  refresh_method text,
  source_of_truth_level text not null default 'unknown' check (source_of_truth_level in ('primary', 'secondary', 'reference_only', 'deprecated', 'unknown')),
  status text not null default 'active' check (status in ('active', 'under_review', 'inconsistent', 'deprecated', 'archived')),
  known_limitations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metrics_catalog (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  metric_name text not null check (char_length(metric_name) between 2 and 180),
  business_definition text not null,
  technical_definition text,
  formula text,
  source_asset_id uuid references public.data_assets(id) on delete set null,
  source_field_name text,
  aggregation_type text not null default 'unknown' check (aggregation_type in ('sum', 'average', 'count', 'distinct_count', 'ratio', 'calculated', 'unknown')),
  grain text not null default 'unknown' check (grain in ('event', 'session', 'user', 'order', 'product', 'campaign', 'country', 'date', 'month', 'mixed', 'unknown')),
  owner text,
  status text not null default 'active' check (status in ('active', 'under_review', 'inconsistent', 'deprecated')),
  known_issues text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fields_catalog (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  field_name text not null check (char_length(field_name) between 1 and 180),
  field_type text not null default 'unknown' check (field_type in ('dimension', 'metric', 'date', 'id', 'category', 'text', 'boolean', 'numeric', 'unknown')),
  source_asset_id uuid references public.data_assets(id) on delete set null,
  description text,
  example_values text[] not null default '{}',
  can_be_used_for_join boolean not null default false,
  join_quality text not null default 'unknown' check (join_quality in ('strong', 'medium', 'weak', 'unsafe', 'unknown')),
  pii_level text not null default 'none' check (pii_level in ('none', 'low', 'medium', 'high', 'sensitive')),
  status text not null default 'active' check (status in ('active', 'under_review', 'inconsistent', 'deprecated')),
  known_issues text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  from_type text not null check (from_type in ('data_asset', 'metric', 'field', 'knowledge_entry')),
  from_id uuid not null,
  to_type text not null check (to_type in ('data_asset', 'metric', 'field', 'knowledge_entry')),
  to_id uuid not null,
  relationship_type text not null default 'related_to' check (relationship_type in (
    'feeds_into',
    'used_in',
    'calculated_from',
    'joined_by',
    'related_to',
    'conflicts_with',
    'replaces',
    'source_of_truth_for',
    'depends_on',
    'explains',
    'other'
  )),
  description text,
  confidence_level text not null default 'medium' check (confidence_level in ('low', 'medium', 'high', 'confirmed')),
  status text not null default 'active' check (status in ('active', 'under_review', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cross_reference_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  rule_name text not null check (char_length(rule_name) between 2 and 180),
  primary_asset_id uuid not null references public.data_assets(id) on delete cascade,
  secondary_asset_id uuid not null references public.data_assets(id) on delete cascade,
  join_field_primary text not null,
  join_field_secondary text not null,
  join_type text not null default 'unknown' check (join_type in ('one_to_one', 'one_to_many', 'many_to_one', 'many_to_many', 'lookup', 'not_recommended', 'unknown')),
  join_quality text not null default 'unknown' check (join_quality in ('strong', 'medium', 'weak', 'unsafe', 'unknown')),
  use_case text,
  warning text,
  status text not null default 'active' check (status in ('active', 'under_review', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_entries_workspace_id on public.knowledge_entries(workspace_id);
create index if not exists idx_knowledge_entries_status on public.knowledge_entries(workspace_id, status);
create index if not exists idx_data_assets_workspace_id on public.data_assets(workspace_id);
create index if not exists idx_metrics_catalog_workspace_id on public.metrics_catalog(workspace_id);
create index if not exists idx_fields_catalog_workspace_id on public.fields_catalog(workspace_id);
create index if not exists idx_knowledge_relationships_workspace_id on public.knowledge_relationships(workspace_id);
create index if not exists idx_cross_reference_rules_workspace_id on public.cross_reference_rules(workspace_id);

drop trigger if exists set_files_updated_at on public.files;
create trigger set_files_updated_at
before update on public.files
for each row execute function public.set_updated_at();

drop trigger if exists set_file_schemas_updated_at on public.file_schemas;
create trigger set_file_schemas_updated_at
before update on public.file_schemas
for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_entries_updated_at on public.knowledge_entries;
create trigger set_knowledge_entries_updated_at
before update on public.knowledge_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_data_assets_updated_at on public.data_assets;
create trigger set_data_assets_updated_at
before update on public.data_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_metrics_catalog_updated_at on public.metrics_catalog;
create trigger set_metrics_catalog_updated_at
before update on public.metrics_catalog
for each row execute function public.set_updated_at();

drop trigger if exists set_fields_catalog_updated_at on public.fields_catalog;
create trigger set_fields_catalog_updated_at
before update on public.fields_catalog
for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_relationships_updated_at on public.knowledge_relationships;
create trigger set_knowledge_relationships_updated_at
before update on public.knowledge_relationships
for each row execute function public.set_updated_at();

drop trigger if exists set_cross_reference_rules_updated_at on public.cross_reference_rules;
create trigger set_cross_reference_rules_updated_at
before update on public.cross_reference_rules
for each row execute function public.set_updated_at();

-- RLS must stay enabled because every Axium Knowledge row is tenant-scoped by workspace_id.
alter table public.knowledge_entries enable row level security;
alter table public.data_assets enable row level security;
alter table public.metrics_catalog enable row level security;
alter table public.fields_catalog enable row level security;
alter table public.knowledge_relationships enable row level security;
alter table public.cross_reference_rules enable row level security;

comment on table public.knowledge_entries is 'RLS enabled. Axium Knowledge entries are isolated by workspace_id.';
comment on table public.data_assets is 'RLS enabled. Data catalog assets are isolated by workspace_id.';
comment on table public.metrics_catalog is 'RLS enabled. Metric definitions are isolated by workspace_id.';
comment on table public.fields_catalog is 'RLS enabled. Field catalog entries are isolated by workspace_id.';
comment on table public.knowledge_relationships is 'RLS enabled. Relationship map rows are isolated by workspace_id.';
comment on table public.cross_reference_rules is 'RLS enabled. Cross-reference rules are isolated by workspace_id.';

drop policy if exists "Members can create chat threads" on public.chat_threads;
create policy "Members can create chat threads"
on public.chat_threads for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id, auth.uid())
  and user_id = auth.uid()
  and coalesce(created_by, auth.uid()) = auth.uid()
);

drop policy if exists "Members can insert analysis runs" on public.analysis_runs;
create policy "Members can insert analysis runs"
on public.analysis_runs for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id, auth.uid())
  and coalesce(user_id, created_by, auth.uid()) = auth.uid()
);

create policy "Members can read knowledge entries"
on public.knowledge_entries for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert knowledge entries"
on public.knowledge_entries for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update knowledge entries"
on public.knowledge_entries for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete knowledge entries"
on public.knowledge_entries for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read data assets"
on public.data_assets for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert data assets"
on public.data_assets for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update data assets"
on public.data_assets for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete data assets"
on public.data_assets for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read metrics"
on public.metrics_catalog for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert metrics"
on public.metrics_catalog for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update metrics"
on public.metrics_catalog for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete metrics"
on public.metrics_catalog for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read fields"
on public.fields_catalog for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert fields"
on public.fields_catalog for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update fields"
on public.fields_catalog for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete fields"
on public.fields_catalog for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read relationships"
on public.knowledge_relationships for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert relationships"
on public.knowledge_relationships for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update relationships"
on public.knowledge_relationships for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete relationships"
on public.knowledge_relationships for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can read cross-reference rules"
on public.cross_reference_rules for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can insert cross-reference rules"
on public.cross_reference_rules for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());

create policy "Members can update cross-reference rules"
on public.cross_reference_rules for update
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()))
with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Members can delete cross-reference rules"
on public.cross_reference_rules for delete
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));
