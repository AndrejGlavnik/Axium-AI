import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ColumnSchema } from "@/lib/analytics/types";
import { findColumnMention, renderGroupByMarkdown, renderSummaryMarkdown, summarizeDataset, groupByDataset } from "@/lib/analytics/engine";
import { loadDatasetFromStorage } from "@/lib/analytics/server";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SchemaRecord = {
  file_id: string;
  row_count: number;
  columns: ColumnSchema[];
  files: {
    id: string;
    file_name: string;
    status: string;
  } | null;
};

export async function buildAnalyticsContext(admin: AdminClient, workspaceId: string, question: string) {
  const { data, error } = await admin
    .from("file_schemas")
    .select("file_id,row_count,columns,files(id,file_name,status)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  const schemas = ((data ?? []) as unknown as SchemaRecord[]).filter((schema) => schema.files);

  if (!schemas.length) {
    return "No structured CSV, XLSX or JSON dataset schemas are currently available in this workspace.";
  }

  const schemaLines = schemas.map((schema) => {
    const columns = schema.columns.map((column) => `${column.name} (${column.type})`).join(", ");
    return `- ${schema.files?.file_name}: ${schema.row_count} rows; columns: ${columns}`;
  });

  const sections = ["Structured datasets available in this workspace:", ...schemaLines];
  const lowerQuestion = question.toLowerCase();
  const wantsAnalysis = /(summari[sz]e|total|average|avg|group|compare|trend|columns?|dataset|revenue|count|by )/.test(
    lowerQuestion
  );

  if (!wantsAnalysis) {
    return sections.join("\n");
  }

  const groupCandidate = detectGroupByRequest(question, schemas);
  if (groupCandidate) {
    try {
      const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, groupCandidate.fileId);
      const result = groupByDataset(dataset.rows, groupCandidate.groupBy, groupCandidate.metric, groupCandidate.operation);
      sections.push("Detected deterministic analytics result:", renderGroupByMarkdown(file.file_name, result));
      return sections.join("\n\n");
    } catch (error) {
      sections.push(`A group-by analysis was requested, but the dataset could not be read: ${formatError(error)}`);
    }
  }

  for (const schema of schemas.slice(0, 2)) {
    try {
      const { file, dataset } = await loadDatasetFromStorage(admin, workspaceId, schema.file_id);
      sections.push(renderSummaryMarkdown(file.file_name, summarizeDataset(dataset.rows, dataset.columns)));
    } catch (error) {
      sections.push(`Could not summarize ${schema.files?.file_name}: ${formatError(error)}`);
    }
  }

  return sections.join("\n\n");
}

function detectGroupByRequest(question: string, schemas: SchemaRecord[]) {
  const lowerQuestion = question.toLowerCase();
  if (!/(group|breakdown|by )/.test(lowerQuestion)) {
    return null;
  }

  for (const schema of schemas) {
    const groupColumn = findColumnMention(schema.columns, question, ["text", "date", "boolean"]);
    if (!groupColumn) {
      continue;
    }

    const metricColumn = findColumnMention(schema.columns, question, ["number"]);
    const operation = lowerQuestion.includes("average") || lowerQuestion.includes("avg")
      ? "avg"
      : lowerQuestion.includes("count")
        ? "count"
        : "sum";

    return {
      fileId: schema.file_id,
      groupBy: groupColumn.name,
      metric: operation === "count" ? null : metricColumn?.name ?? null,
      operation
    } as const;
  }

  return null;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
