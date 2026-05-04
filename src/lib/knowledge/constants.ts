export const knowledgeEntryTypes = [
  "Metric Definition",
  "Data Source Explanation",
  "Dashboard Explanation",
  "Data Quality Issue",
  "Incident",
  "Root Cause",
  "Connection Change",
  "Tracking Change",
  "Business Rule",
  "Manual Adjustment",
  "Known Limitation",
  "Resolved Issue",
  "Open Issue",
  "Recommendation"
] as const;

export const knowledgeEntryStatuses = ["draft", "active", "open", "resolved", "deprecated"] as const;
export const confidenceLevels = ["low", "medium", "high", "confirmed"] as const;

export const dataAssetTypes = [
  "data_source",
  "dataset",
  "data_stream",
  "dashboard",
  "report",
  "table",
  "file",
  "api_connection",
  "manual_upload",
  "metric_layer",
  "other"
] as const;

export const sourcePlatforms = [
  "Datorama",
  "Databox",
  "GA4",
  "BigQuery",
  "Google Sheets",
  "Excel",
  "CSV",
  "S3",
  "API",
  "Manual",
  "Other"
] as const;

export const sourceOfTruthLevels = ["primary", "secondary", "reference_only", "deprecated", "unknown"] as const;
export const dataAssetStatuses = ["active", "under_review", "inconsistent", "deprecated", "archived"] as const;

export const aggregationTypes = ["sum", "average", "count", "distinct_count", "ratio", "calculated", "unknown"] as const;
export const metricGrains = ["event", "session", "user", "order", "product", "campaign", "country", "date", "month", "mixed", "unknown"] as const;
export const catalogStatuses = ["active", "under_review", "inconsistent", "deprecated"] as const;

export const fieldTypes = ["dimension", "metric", "date", "id", "category", "text", "boolean", "numeric", "unknown"] as const;
export const joinQualities = ["strong", "medium", "weak", "unsafe", "unknown"] as const;
export const piiLevels = ["none", "low", "medium", "high", "sensitive"] as const;

export const relationshipNodeTypes = ["data_asset", "metric", "field", "knowledge_entry"] as const;
export const relationshipTypes = [
  "feeds_into",
  "used_in",
  "calculated_from",
  "joined_by",
  "related_to",
  "conflicts_with",
  "replaces",
  "source_of_truth_for",
  "depends_on",
  "explains",
  "other"
] as const;

export const crossReferenceJoinTypes = [
  "one_to_one",
  "one_to_many",
  "many_to_one",
  "many_to_many",
  "lookup",
  "not_recommended",
  "unknown"
] as const;

export type KnowledgeEntryType = (typeof knowledgeEntryTypes)[number];
export type KnowledgeEntryStatus = (typeof knowledgeEntryStatuses)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];
export type DataAssetType = (typeof dataAssetTypes)[number];
export type SourcePlatform = (typeof sourcePlatforms)[number];
export type SourceOfTruthLevel = (typeof sourceOfTruthLevels)[number];
export type DataAssetStatus = (typeof dataAssetStatuses)[number];
export type AggregationType = (typeof aggregationTypes)[number];
export type MetricGrain = (typeof metricGrains)[number];
export type CatalogStatus = (typeof catalogStatuses)[number];
export type FieldType = (typeof fieldTypes)[number];
export type JoinQuality = (typeof joinQualities)[number];
export type PiiLevel = (typeof piiLevels)[number];
export type RelationshipNodeType = (typeof relationshipNodeTypes)[number];
export type RelationshipType = (typeof relationshipTypes)[number];
export type CrossReferenceJoinType = (typeof crossReferenceJoinTypes)[number];

export type KnowledgeEntity =
  | "entries"
  | "assets"
  | "metrics"
  | "fields"
  | "relationships"
  | "crossReferenceRules";
