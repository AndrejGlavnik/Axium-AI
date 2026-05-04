import { z } from "zod";
import {
  aggregationTypes,
  catalogStatuses,
  confidenceLevels,
  crossReferenceJoinTypes,
  dataAssetStatuses,
  dataAssetTypes,
  fieldTypes,
  joinQualities,
  knowledgeEntryStatuses,
  knowledgeEntryTypes,
  metricGrains,
  piiLevels,
  relationshipNodeTypes,
  relationshipTypes,
  sourceOfTruthLevels,
  sourcePlatforms
} from "@/lib/knowledge/constants";

const optionalText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(4000).nullable().optional()
);

const optionalShortText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(300).nullable().optional()
);

const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(30).nullable().optional()
);

const tagsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string().min(1).max(80)).default([]));

export const workspaceScopedSchema = z.object({
  workspace_id: z.string().uuid()
});

export const knowledgeEntryCreateSchema = workspaceScopedSchema.extend({
  title: z.string().trim().min(2).max(180),
  type: z.enum(knowledgeEntryTypes).default("Data Source Explanation"),
  description: z.string().trim().min(1).max(8000),
  affected_system: optionalShortText,
  affected_dashboard: optionalShortText,
  affected_metric: optionalShortText,
  affected_date_start: optionalDate,
  affected_date_end: optionalDate,
  root_cause: optionalText,
  business_impact: optionalText,
  recommended_action: optionalText,
  status: z.enum(knowledgeEntryStatuses).default("active"),
  confidence_level: z.enum(confidenceLevels).default("medium"),
  tags: tagsSchema,
  source_file_id: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().uuid().nullable().optional()),
  source_url: optionalShortText
});

export const knowledgeEntryUpdateSchema = knowledgeEntryCreateSchema.omit({ workspace_id: true }).partial();

export const dataAssetCreateSchema = workspaceScopedSchema.extend({
  asset_name: z.string().trim().min(2).max(180),
  asset_type: z.enum(dataAssetTypes).default("dataset"),
  source_platform: z.enum(sourcePlatforms).default("Other"),
  description: optionalText,
  owner: optionalShortText,
  refresh_frequency: optionalShortText,
  refresh_method: optionalShortText,
  source_of_truth_level: z.enum(sourceOfTruthLevels).default("unknown"),
  status: z.enum(dataAssetStatuses).default("active"),
  known_limitations: optionalText
});

export const dataAssetUpdateSchema = dataAssetCreateSchema.omit({ workspace_id: true }).partial();

export const metricCreateSchema = workspaceScopedSchema.extend({
  metric_name: z.string().trim().min(2).max(180),
  business_definition: z.string().trim().min(1).max(8000),
  technical_definition: optionalText,
  formula: optionalText,
  source_asset_id: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().uuid().nullable().optional()),
  source_field_name: optionalShortText,
  aggregation_type: z.enum(aggregationTypes).default("unknown"),
  grain: z.enum(metricGrains).default("unknown"),
  owner: optionalShortText,
  status: z.enum(catalogStatuses).default("active"),
  known_issues: optionalText
});

export const metricUpdateSchema = metricCreateSchema.omit({ workspace_id: true }).partial();

export const fieldCreateSchema = workspaceScopedSchema.extend({
  field_name: z.string().trim().min(1).max(180),
  field_type: z.enum(fieldTypes).default("unknown"),
  source_asset_id: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().uuid().nullable().optional()),
  description: optionalText,
  example_values: tagsSchema,
  can_be_used_for_join: z.coerce.boolean().default(false),
  join_quality: z.enum(joinQualities).default("unknown"),
  pii_level: z.enum(piiLevels).default("none"),
  status: z.enum(catalogStatuses).default("active"),
  known_issues: optionalText
});

export const fieldUpdateSchema = fieldCreateSchema.omit({ workspace_id: true }).partial();

export const relationshipCreateSchema = workspaceScopedSchema.extend({
  from_type: z.enum(relationshipNodeTypes),
  from_id: z.string().uuid(),
  to_type: z.enum(relationshipNodeTypes),
  to_id: z.string().uuid(),
  relationship_type: z.enum(relationshipTypes).default("related_to"),
  description: optionalText,
  confidence_level: z.enum(confidenceLevels).default("medium"),
  status: z.enum(catalogStatuses).default("active")
});

export const relationshipUpdateSchema = relationshipCreateSchema.omit({ workspace_id: true }).partial();

export const crossReferenceRuleCreateSchema = workspaceScopedSchema.extend({
  rule_name: z.string().trim().min(2).max(180),
  primary_asset_id: z.string().uuid(),
  secondary_asset_id: z.string().uuid(),
  join_field_primary: z.string().trim().min(1).max(180),
  join_field_secondary: z.string().trim().min(1).max(180),
  join_type: z.enum(crossReferenceJoinTypes).default("unknown"),
  join_quality: z.enum(joinQualities).default("unknown"),
  use_case: optionalText,
  warning: optionalText,
  status: z.enum(catalogStatuses).default("active")
});

export const crossReferenceRuleUpdateSchema = crossReferenceRuleCreateSchema.omit({ workspace_id: true }).partial();

export const searchKnowledgeSchema = workspaceScopedSchema.extend({
  query: z.string().trim().min(1).max(200)
});
