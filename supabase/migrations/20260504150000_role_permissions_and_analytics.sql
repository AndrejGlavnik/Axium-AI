-- Tighten workspace write policies so viewer remains read-only.

create or replace function public.is_workspace_writer(target_workspace_id uuid, target_user_id uuid)
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
      and wm.role in ('owner', 'admin', 'analyst')
  );
$$;

drop policy if exists "Members can insert files" on public.files;
create policy "Writers can insert files"
on public.files for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and uploaded_by = auth.uid());

drop policy if exists "Members can insert file schemas" on public.file_schemas;
create policy "Writers can insert file schemas"
on public.file_schemas for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can create chat threads" on public.chat_threads;
create policy "Writers can create chat threads"
on public.chat_threads for insert
to authenticated
with check (
  public.is_workspace_writer(workspace_id, auth.uid())
  and user_id = auth.uid()
  and coalesce(created_by, auth.uid()) = auth.uid()
);

drop policy if exists "Members can update chat threads" on public.chat_threads;
create policy "Writers can update chat threads"
on public.chat_threads for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert chat messages" on public.chat_messages;
create policy "Writers can insert chat messages"
on public.chat_messages for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert analysis runs" on public.analysis_runs;
create policy "Writers can insert analysis runs"
on public.analysis_runs for insert
to authenticated
with check (
  public.is_workspace_writer(workspace_id, auth.uid())
  and coalesce(user_id, created_by, auth.uid()) = auth.uid()
);

drop policy if exists "Members can insert knowledge entries" on public.knowledge_entries;
create policy "Writers can insert knowledge entries"
on public.knowledge_entries for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update knowledge entries" on public.knowledge_entries;
create policy "Writers can update knowledge entries"
on public.knowledge_entries for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete knowledge entries" on public.knowledge_entries;
create policy "Writers can delete knowledge entries"
on public.knowledge_entries for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert data assets" on public.data_assets;
create policy "Writers can insert data assets"
on public.data_assets for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update data assets" on public.data_assets;
create policy "Writers can update data assets"
on public.data_assets for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete data assets" on public.data_assets;
create policy "Writers can delete data assets"
on public.data_assets for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert metrics" on public.metrics_catalog;
create policy "Writers can insert metrics"
on public.metrics_catalog for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update metrics" on public.metrics_catalog;
create policy "Writers can update metrics"
on public.metrics_catalog for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete metrics" on public.metrics_catalog;
create policy "Writers can delete metrics"
on public.metrics_catalog for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert fields" on public.fields_catalog;
create policy "Writers can insert fields"
on public.fields_catalog for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update fields" on public.fields_catalog;
create policy "Writers can update fields"
on public.fields_catalog for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete fields" on public.fields_catalog;
create policy "Writers can delete fields"
on public.fields_catalog for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert relationships" on public.knowledge_relationships;
create policy "Writers can insert relationships"
on public.knowledge_relationships for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update relationships" on public.knowledge_relationships;
create policy "Writers can update relationships"
on public.knowledge_relationships for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete relationships" on public.knowledge_relationships;
create policy "Writers can delete relationships"
on public.knowledge_relationships for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can insert cross-reference rules" on public.cross_reference_rules;
create policy "Writers can insert cross-reference rules"
on public.cross_reference_rules for insert
to authenticated
with check (public.is_workspace_writer(workspace_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "Members can update cross-reference rules" on public.cross_reference_rules;
create policy "Writers can update cross-reference rules"
on public.cross_reference_rules for update
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()))
with check (public.is_workspace_writer(workspace_id, auth.uid()));

drop policy if exists "Members can delete cross-reference rules" on public.cross_reference_rules;
create policy "Writers can delete cross-reference rules"
on public.cross_reference_rules for delete
to authenticated
using (public.is_workspace_writer(workspace_id, auth.uid()));
