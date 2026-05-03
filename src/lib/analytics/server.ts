import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/constants";
import { parseDataset } from "@/lib/analytics/parser";
import { groupByDataset, renderGroupByMarkdown, renderSummaryMarkdown, summarizeDataset } from "@/lib/analytics/engine";
import type { GroupByOperation, ParsedDataset } from "@/lib/analytics/types";
import type { WorkspaceFile } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function loadDatasetFromStorage(
  admin: AdminClient,
  workspaceId: string,
  fileId?: string | null
): Promise<{ file: WorkspaceFile; dataset: ParsedDataset }> {
  let query = admin
    .from("files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("file_type", [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json"
    ])
    .order("created_at", { ascending: false });

  if (fileId) {
    query = query.eq("id", fileId);
  }

  const { data: file, error } = await query.limit(1).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!file) {
    throw new Error("No structured dataset found in this workspace.");
  }

  const { data: blob, error: downloadError } = await admin.storage.from(STORAGE_BUCKET).download(file.storage_path);
  if (downloadError || !blob) {
    throw new Error(downloadError?.message || "Could not download file from storage.");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  return {
    file,
    dataset: await parseDataset(buffer, file.file_name)
  };
}

export async function summarizeStoredDataset(admin: AdminClient, workspaceId: string, fileId?: string | null) {
  const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, fileId);
  const summary = summarizeDataset(dataset.rows, dataset.columns);
  return {
    file,
    dataset,
    summary,
    markdown: renderSummaryMarkdown(file.file_name, summary)
  };
}

export async function groupStoredDataset(
  admin: AdminClient,
  workspaceId: string,
  fileId: string | null,
  groupBy: string,
  metric: string | null,
  operation: GroupByOperation
) {
  const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, fileId);
  const result = groupByDataset(dataset.rows, groupBy, metric, operation);
  return {
    file,
    dataset,
    result,
    markdown: renderGroupByMarkdown(file.file_name, result)
  };
}
