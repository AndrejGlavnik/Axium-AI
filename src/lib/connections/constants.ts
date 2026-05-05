export const connectionProviders = [
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

export const connectionTypes = [
  "oauth",
  "api_key",
  "service_account",
  "warehouse",
  "sheet",
  "file_export",
  "dashboard",
  "manual",
  "other"
] as const;

export const connectionAuthTypes = [
  "none",
  "api_key",
  "bearer_token",
  "basic",
  "oauth2",
  "service_account",
  "custom"
] as const;

export const connectionStatuses = [
  "draft",
  "needs_credentials",
  "connected",
  "error",
  "paused",
  "archived"
] as const;

export const syncFrequencies = ["manual", "hourly", "daily", "weekly", "monthly", "unknown"] as const;

export const connectionResourceTypes = [
  "account",
  "property",
  "dataset",
  "table",
  "dashboard",
  "report",
  "sheet",
  "api_endpoint",
  "file_export",
  "metric",
  "field",
  "linked_asset",
  "other"
] as const;

export const connectionResourceStatuses = ["active", "under_review", "unavailable", "deprecated", "archived"] as const;

export const connectionTemplates = [
  {
    provider: "Datorama",
    connection_type: "dashboard",
    auth_type: "api_key",
    description: "Document a Datorama dashboard or API connection used for marketing and sales reporting."
  },
  {
    provider: "Databox",
    connection_type: "dashboard",
    auth_type: "api_key",
    description: "Document Databox dashboards, scorecards and source metrics."
  },
  {
    provider: "GA4",
    connection_type: "oauth",
    auth_type: "oauth2",
    description: "Document GA4 properties, event tracking and traffic/conversion data."
  },
  {
    provider: "BigQuery",
    connection_type: "warehouse",
    auth_type: "service_account",
    description: "Document BigQuery datasets, tables and source-of-truth warehouse logic."
  },
  {
    provider: "Google Sheets",
    connection_type: "sheet",
    auth_type: "oauth2",
    description: "Document Google Sheets used as mapping files, exports or manual reporting inputs."
  },
  {
    provider: "API",
    connection_type: "api_key",
    auth_type: "api_key",
    description: "Document any client API connection, base URL, owner, scopes and expected datasets."
  }
] as const;

export type ConnectionProvider = (typeof connectionProviders)[number];
export type ConnectionType = (typeof connectionTypes)[number];
export type ConnectionAuthType = (typeof connectionAuthTypes)[number];
export type ConnectionStatus = (typeof connectionStatuses)[number];
export type SyncFrequency = (typeof syncFrequencies)[number];
export type ConnectionResourceType = (typeof connectionResourceTypes)[number];
export type ConnectionResourceStatus = (typeof connectionResourceStatuses)[number];
