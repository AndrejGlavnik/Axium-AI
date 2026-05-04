import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/constants";
import { parseDataset } from "@/lib/analytics/parser";
import {
  calculateTotals,
  comparePeriods,
  groupByDataset,
  renderColumnsMarkdown,
  renderGroupByMarkdown,
  renderPeriodComparisonMarkdown,
  renderSummaryMarkdown,
  renderTotalsMarkdown,
  summarizeDataset
} from "@/lib/analytics/engine";
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

export async function listStoredDatasetColumns(admin: AdminClient, workspaceId: string, fileId?: string | null) {
  const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, fileId);
  return {
    file,
    columns: dataset.columns,
    markdown: renderColumnsMarkdown(file.file_name, dataset.columns)
  };
}

export async function calculateStoredTotals(
  admin: AdminClient,
  workspaceId: string,
  fileId: string | null,
  metrics?: string[] | null
) {
  const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, fileId);
  const result = calculateTotals(dataset.rows, dataset.columns, metrics);
  return {
    file,
    dataset,
    result,
    markdown: renderTotalsMarkdown(file.file_name, result)
  };
}

export async function compareStoredPeriods(
  admin: AdminClient,
  workspaceId: string,
  fileId: string | null,
  options: {
    dateColumn?: string | null;
    metric?: string | null;
    currentStart?: string | null;
    currentEnd?: string | null;
    previousStart?: string | null;
    previousEnd?: string | null;
  }
) {
  const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, fileId);
  const result = comparePeriods(dataset.rows, dataset.columns, options);
  return {
    file,
    dataset,
    result,
    markdown: renderPeriodComparisonMarkdown(file.file_name, result)
  };
}
