import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type AxiumKnowledgeContext = {
  prompt: string;
  used: {
    entries: string[];
    assets: string[];
    metrics: string[];
    fields: string[];
    relationships: string[];
    rules: string[];
  };
};

export async function buildAxiumKnowledgeContext(admin: AdminClient, workspaceId: string): Promise<AxiumKnowledgeContext> {
  const [files, schemas, entries, assets, metrics, fields, relationships, rules] = await Promise.all([
    admin
      .from("files")
      .select("id,file_name,file_type,status,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("file_schemas")
      .select("file_id,detected_columns,detected_date_columns,detected_metric_columns,detected_dimension_columns,row_count")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("knowledge_entries")
      .select("id,title,type,description,affected_system,affected_dashboard,affected_metric,status,confidence_level,tags,recommended_action,root_cause,business_impact,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(24),
    admin
      .from("data_assets")
      .select("id,asset_name,asset_type,source_platform,description,source_of_truth_level,status,known_limitations,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(24),
    admin
      .from("metrics_catalog")
      .select("id,metric_name,business_definition,technical_definition,formula,source_field_name,aggregation_type,grain,status,known_issues,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(30),
    admin
      .from("fields_catalog")
      .select("id,field_name,field_type,description,example_values,can_be_used_for_join,join_quality,pii_level,status,known_issues,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(30),
    admin
      .from("knowledge_relationships")
      .select("id,from_type,from_id,to_type,to_id,relationship_type,description,confidence_level,status,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(30),
    admin
      .from("cross_reference_rules")
      .select("id,rule_name,primary_asset_id,secondary_asset_id,join_field_primary,join_field_secondary,join_type,join_quality,use_case,warning,status,updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(30)
  ]);

  const errors = [files.error, schemas.error, entries.error, assets.error, metrics.error, fields.error, relationships.error, rules.error].filter(Boolean);
  if (errors.length) {
    throw new Error(errors[0]?.message ?? "Could not load Axium Knowledge context.");
  }

  const fileNameById = new Map((files.data ?? []).map((file) => [file.id, file.file_name]));

  const lines = [
    "Axium Knowledge workspace context:",
    "",
    "Uploaded files:",
    listOrNone(
      (files.data ?? []).map((file) => `- ${file.file_name} (${file.file_type}; status: ${file.status})`)
    ),
    "",
    "Detected structured file schemas:",
    listOrNone(
      (schemas.data ?? []).map((schema) => {
        const fileName = fileNameById.get(schema.file_id);
        return [
          `- ${fileName ?? schema.file_id}: ${schema.row_count} rows`,
          `columns: ${(schema.detected_columns ?? []).join(", ") || "not detected"}`,
          `date columns: ${(schema.detected_date_columns ?? []).join(", ") || "none"}`,
          `metric columns: ${(schema.detected_metric_columns ?? []).join(", ") || "none"}`,
          `dimension columns: ${(schema.detected_dimension_columns ?? []).join(", ") || "none"}`
        ].join("; ");
      })
    ),
    "",
    "Knowledge entries:",
    listOrNone(
      (entries.data ?? []).map(
        (entry) =>
          `- ${entry.title} [${entry.type}; ${entry.status}; confidence ${entry.confidence_level}]: ${compact(
            entry.description
          )}${entry.affected_metric ? ` Affected metric: ${entry.affected_metric}.` : ""}${
            entry.recommended_action ? ` Recommended action: ${entry.recommended_action}.` : ""
          }`
      )
    ),
    "",
    "Data assets:",
    listOrNone(
      (assets.data ?? []).map(
        (asset) =>
          `- ${asset.asset_name} [${asset.asset_type}; ${asset.source_platform}; ${asset.source_of_truth_level}; ${asset.status}]: ${compact(
            asset.description
          )}${asset.known_limitations ? ` Limitations: ${asset.known_limitations}.` : ""}`
      )
    ),
    "",
    "Metric catalog:",
    listOrNone(
      (metrics.data ?? []).map(
        (metric) =>
          `- ${metric.metric_name} [${metric.aggregation_type}; grain ${metric.grain}; ${metric.status}]: ${compact(
            metric.business_definition
          )}${metric.formula ? ` Formula: ${metric.formula}.` : ""}${metric.known_issues ? ` Issues: ${metric.known_issues}.` : ""}`
      )
    ),
    "",
    "Fields catalog:",
    listOrNone(
      (fields.data ?? []).map(
        (field) =>
          `- ${field.field_name} [${field.field_type}; join ${field.join_quality}; PII ${field.pii_level}; ${field.status}]: ${compact(
            field.description
          )}${field.can_be_used_for_join ? " Marked usable for joins." : ""}${field.known_issues ? ` Issues: ${field.known_issues}.` : ""}`
      )
    ),
    "",
    "Relationship map:",
    listOrNone(
      (relationships.data ?? []).map(
        (relationship) =>
          `- ${relationship.from_type}:${relationship.from_id} ${relationship.relationship_type} ${relationship.to_type}:${relationship.to_id} [${relationship.confidence_level}; ${relationship.status}] ${compact(
            relationship.description
          )}`
      )
    ),
    "",
    "Cross-reference rules:",
    listOrNone(
      (rules.data ?? []).map(
        (rule) =>
          `- ${rule.rule_name}: ${rule.join_field_primary} to ${rule.join_field_secondary} [${rule.join_type}; quality ${rule.join_quality}; ${rule.status}] Use case: ${compact(
            rule.use_case
          )}${rule.warning ? ` Warning: ${rule.warning}.` : ""}`
      )
    )
  ];

  return {
    prompt: lines.join("\n"),
    used: {
      entries: (entries.data ?? []).map((entry) => entry.title),
      assets: (assets.data ?? []).map((asset) => asset.asset_name),
      metrics: (metrics.data ?? []).map((metric) => metric.metric_name),
      fields: (fields.data ?? []).map((field) => field.field_name),
      relationships: (relationships.data ?? []).map((relationship) => relationship.id),
      rules: (rules.data ?? []).map((rule) => rule.rule_name)
    }
  };
}

function listOrNone(lines: string[]) {
  return lines.length ? lines.join("\n") : "- None documented yet.";
}

function compact(value: string | null | undefined) {
  if (!value) {
    return "No description documented.";
  }
  return value.replace(/\s+/g, " ").slice(0, 900);
}
