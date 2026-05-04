"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Columns3,
  Database,
  GitBranch,
  Link2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sigma,
  Trash2,
  X
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useWorkspace } from "@/components/workspace/workspace-provider";
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
  sourcePlatforms,
  type RelationshipNodeType
} from "@/lib/knowledge/constants";
import type {
  CrossReferenceRule,
  DataAsset,
  FieldCatalogItem,
  KnowledgeEntry,
  KnowledgeRelationship,
  MetricCatalogItem
} from "@/types/database";

type SectionKey = "entries" | "assets" | "metrics" | "fields" | "relationships" | "crossReferenceRules";
type TabKey = "overview" | SectionKey;
type KnowledgeRecord =
  | KnowledgeEntry
  | DataAsset
  | MetricCatalogItem
  | FieldCatalogItem
  | KnowledgeRelationship
  | CrossReferenceRule;
type FormValue = string | boolean | string[] | null;
type FormValues = Record<string, FormValue>;

type FieldConfig = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "select" | "date" | "tags" | "checkbox" | "asset" | "node_id";
  options?: readonly string[];
  required?: boolean;
  full?: boolean;
  placeholder?: string;
};

type FilterConfig = {
  name: string;
  label: string;
  options?: readonly string[];
  kind?: "text" | "select";
};

type SectionConfig = {
  label: string;
  description: string;
  listPath: string;
  createPath: string;
  responseKey: string;
  titleField: string;
  summaryFields: string[];
  filters: FilterConfig[];
  fields: FieldConfig[];
};

type KnowledgeState = {
  entries: KnowledgeEntry[];
  assets: DataAsset[];
  metrics: MetricCatalogItem[];
  fields: FieldCatalogItem[];
  relationships: KnowledgeRelationship[];
  crossReferenceRules: CrossReferenceRule[];
};

const sectionKeys: SectionKey[] = ["entries", "assets", "metrics", "fields", "relationships", "crossReferenceRules"];

const sectionConfigs: Record<SectionKey, SectionConfig> = {
  entries: {
    label: "Knowledge Entries",
    description: "Internal explanations, incidents, business rules and analytics memory.",
    listPath: "/api/knowledge",
    createPath: "/api/knowledge/create",
    responseKey: "entries",
    titleField: "title",
    summaryFields: ["type", "affected_system", "affected_dashboard", "affected_metric", "status", "confidence_level"],
    filters: [
      { name: "type", label: "Type", options: knowledgeEntryTypes },
      { name: "status", label: "Status", options: knowledgeEntryStatuses },
      { name: "affected_system", label: "System" },
      { name: "affected_metric", label: "Metric" },
      { name: "affected_dashboard", label: "Dashboard" },
      { name: "tags", label: "Tag" }
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "type", label: "Type", kind: "select", options: knowledgeEntryTypes },
      { name: "description", label: "Description", kind: "textarea", required: true, full: true },
      { name: "affected_system", label: "Affected system" },
      { name: "affected_dashboard", label: "Affected dashboard" },
      { name: "affected_metric", label: "Affected metric" },
      { name: "affected_date_start", label: "Affected date start", kind: "date" },
      { name: "affected_date_end", label: "Affected date end", kind: "date" },
      { name: "root_cause", label: "Root cause", kind: "textarea", full: true },
      { name: "business_impact", label: "Business impact", kind: "textarea", full: true },
      { name: "recommended_action", label: "Recommended action", kind: "textarea", full: true },
      { name: "status", label: "Status", kind: "select", options: knowledgeEntryStatuses },
      { name: "confidence_level", label: "Confidence", kind: "select", options: confidenceLevels },
      { name: "tags", label: "Tags", kind: "tags", placeholder: "ga4, revenue, source of truth" },
      { name: "source_url", label: "Source URL" }
    ]
  },
  assets: {
    label: "Data Catalog",
    description: "A catalog of data sources, dashboards, reports, files and metric layers.",
    listPath: "/api/knowledge/assets",
    createPath: "/api/knowledge/assets/create",
    responseKey: "assets",
    titleField: "asset_name",
    summaryFields: ["asset_type", "source_platform", "source_of_truth_level", "status"],
    filters: [
      { name: "source_platform", label: "Platform", options: sourcePlatforms },
      { name: "asset_type", label: "Asset type", options: dataAssetTypes },
      { name: "status", label: "Status", options: dataAssetStatuses },
      { name: "source_of_truth_level", label: "Truth level", options: sourceOfTruthLevels }
    ],
    fields: [
      { name: "asset_name", label: "Asset name", required: true },
      { name: "asset_type", label: "Asset type", kind: "select", options: dataAssetTypes },
      { name: "source_platform", label: "Source platform", kind: "select", options: sourcePlatforms },
      { name: "description", label: "Description", kind: "textarea", full: true },
      { name: "owner", label: "Owner" },
      { name: "refresh_frequency", label: "Refresh frequency" },
      { name: "refresh_method", label: "Refresh method" },
      { name: "source_of_truth_level", label: "Source of truth level", kind: "select", options: sourceOfTruthLevels },
      { name: "status", label: "Status", kind: "select", options: dataAssetStatuses },
      { name: "known_limitations", label: "Known limitations", kind: "textarea", full: true }
    ]
  },
  metrics: {
    label: "Metrics",
    description: "Definitions, formulas, grain, aggregation logic and known metric issues.",
    listPath: "/api/knowledge/metrics",
    createPath: "/api/knowledge/metrics/create",
    responseKey: "metrics",
    titleField: "metric_name",
    summaryFields: ["aggregation_type", "grain", "source_field_name", "status"],
    filters: [
      { name: "source_asset_id", label: "Source asset", kind: "select" },
      { name: "status", label: "Status", options: catalogStatuses },
      { name: "aggregation_type", label: "Aggregation", options: aggregationTypes },
      { name: "grain", label: "Grain", options: metricGrains }
    ],
    fields: [
      { name: "metric_name", label: "Metric name", required: true },
      { name: "business_definition", label: "Business definition", kind: "textarea", required: true, full: true },
      { name: "technical_definition", label: "Technical definition", kind: "textarea", full: true },
      { name: "formula", label: "Formula", kind: "textarea", full: true },
      { name: "source_asset_id", label: "Source asset", kind: "asset" },
      { name: "source_field_name", label: "Source field name" },
      { name: "aggregation_type", label: "Aggregation", kind: "select", options: aggregationTypes },
      { name: "grain", label: "Grain", kind: "select", options: metricGrains },
      { name: "owner", label: "Owner" },
      { name: "status", label: "Status", kind: "select", options: catalogStatuses },
      { name: "known_issues", label: "Known issues", kind: "textarea", full: true }
    ]
  },
  fields: {
    label: "Fields",
    description: "Dimensions, IDs, date fields, metrics, examples and join quality.",
    listPath: "/api/knowledge/fields",
    createPath: "/api/knowledge/fields/create",
    responseKey: "fields",
    titleField: "field_name",
    summaryFields: ["field_type", "join_quality", "pii_level", "status"],
    filters: [
      { name: "source_asset_id", label: "Source asset", kind: "select" },
      { name: "field_type", label: "Field type", options: fieldTypes },
      { name: "join_quality", label: "Join quality", options: joinQualities },
      { name: "pii_level", label: "PII", options: piiLevels }
    ],
    fields: [
      { name: "field_name", label: "Field name", required: true },
      { name: "field_type", label: "Field type", kind: "select", options: fieldTypes },
      { name: "source_asset_id", label: "Source asset", kind: "asset" },
      { name: "description", label: "Description", kind: "textarea", full: true },
      { name: "example_values", label: "Example values", kind: "tags", placeholder: "US, UK, DE" },
      { name: "can_be_used_for_join", label: "Can be used for joins", kind: "checkbox" },
      { name: "join_quality", label: "Join quality", kind: "select", options: joinQualities },
      { name: "pii_level", label: "PII level", kind: "select", options: piiLevels },
      { name: "status", label: "Status", kind: "select", options: catalogStatuses },
      { name: "known_issues", label: "Known issues", kind: "textarea", full: true }
    ]
  },
  relationships: {
    label: "Relationships",
    description: "Simple list-based map of how assets, metrics, fields and entries connect.",
    listPath: "/api/knowledge/relationships",
    createPath: "/api/knowledge/relationships/create",
    responseKey: "relationships",
    titleField: "relationship_type",
    summaryFields: ["from_type", "to_type", "confidence_level", "status"],
    filters: [
      { name: "relationship_type", label: "Relationship", options: relationshipTypes },
      { name: "confidence_level", label: "Confidence", options: confidenceLevels },
      { name: "status", label: "Status", options: catalogStatuses }
    ],
    fields: [
      { name: "from_type", label: "From type", kind: "select", options: relationshipNodeTypes },
      { name: "from_id", label: "From item", kind: "node_id", required: true },
      { name: "relationship_type", label: "Relationship", kind: "select", options: relationshipTypes },
      { name: "to_type", label: "To type", kind: "select", options: relationshipNodeTypes },
      { name: "to_id", label: "To item", kind: "node_id", required: true },
      { name: "description", label: "Description", kind: "textarea", full: true },
      { name: "confidence_level", label: "Confidence", kind: "select", options: confidenceLevels },
      { name: "status", label: "Status", kind: "select", options: catalogStatuses }
    ]
  },
  crossReferenceRules: {
    label: "Cross-reference Rules",
    description: "Which datasets can be combined, how joins work and what is risky.",
    listPath: "/api/knowledge/cross-reference-rules",
    createPath: "/api/knowledge/cross-reference-rules/create",
    responseKey: "rules",
    titleField: "rule_name",
    summaryFields: ["join_field_primary", "join_field_secondary", "join_quality", "status"],
    filters: [
      { name: "join_quality", label: "Join quality", options: joinQualities },
      { name: "join_type", label: "Join type", options: crossReferenceJoinTypes },
      { name: "status", label: "Status", options: catalogStatuses }
    ],
    fields: [
      { name: "rule_name", label: "Rule name", required: true },
      { name: "primary_asset_id", label: "Primary asset", kind: "asset", required: true },
      { name: "secondary_asset_id", label: "Secondary asset", kind: "asset", required: true },
      { name: "join_field_primary", label: "Primary join field", required: true },
      { name: "join_field_secondary", label: "Secondary join field", required: true },
      { name: "join_type", label: "Join type", kind: "select", options: crossReferenceJoinTypes },
      { name: "join_quality", label: "Join quality", kind: "select", options: joinQualities },
      { name: "use_case", label: "Safe use case", kind: "textarea", full: true },
      { name: "warning", label: "Warning", kind: "textarea", full: true },
      { name: "status", label: "Status", kind: "select", options: catalogStatuses }
    ]
  }
};

const tabs: Array<{ key: TabKey; label: string; icon: typeof BookOpenText }> = [
  { key: "overview", label: "Overview", icon: BookOpenText },
  { key: "entries", label: "Knowledge Entries", icon: BookOpenText },
  { key: "assets", label: "Data Catalog", icon: Database },
  { key: "metrics", label: "Metrics", icon: Sigma },
  { key: "fields", label: "Fields", icon: Columns3 },
  { key: "relationships", label: "Relationships", icon: GitBranch },
  { key: "crossReferenceRules", label: "Cross-reference Rules", icon: Link2 }
];

const emptyState: KnowledgeState = {
  entries: [],
  assets: [],
  metrics: [],
  fields: [],
  relationships: [],
  crossReferenceRules: []
};

export function KnowledgeClient() {
  const { activeWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [data, setData] = useState<KnowledgeState>(emptyState);
  const [forms, setForms] = useState<Record<SectionKey, FormValues>>(() => buildInitialForms());
  const [filters, setFilters] = useState<Record<SectionKey, Record<string, string>>>(() => buildInitialFilters());
  const [search, setSearch] = useState<Record<SectionKey, string>>(() => buildInitialSearch());
  const [editing, setEditing] = useState<Record<SectionKey, string | null>>(() => buildEmptyRecord(null));
  const [selected, setSelected] = useState<Record<SectionKey, KnowledgeRecord | null>>(() => buildEmptyRecord(null));
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadKnowledge() {
    if (!activeWorkspace) {
      setData(emptyState);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const loaded = await Promise.all(
      sectionKeys.map(async (key) => {
        const config = sectionConfigs[key];
        const response = await fetch(`${config.listPath}?workspace_id=${activeWorkspace.id}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || `Could not load ${config.label}.`);
        }
        return [key, payload[config.responseKey] ?? []] as const;
      })
    ).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load Axium Knowledge.");
      return null;
    });

    if (loaded) {
      setData(Object.fromEntries(loaded) as KnowledgeState);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadKnowledge();
  }, [activeWorkspace?.id]);

  const stats = useMemo(() => {
    const issueTypes = new Set(["Data Quality Issue", "Incident", "Open Issue"]);
    return [
      { label: "Total data assets", value: data.assets.length },
      { label: "Total metrics", value: data.metrics.length },
      { label: "Total fields", value: data.fields.length },
      { label: "Active known issues", value: data.entries.filter((entry) => issueTypes.has(entry.type) && ["active", "open"].includes(entry.status)).length },
      { label: "Inconsistent assets", value: data.assets.filter((asset) => asset.status === "inconsistent").length },
      { label: "Deprecated assets", value: data.assets.filter((asset) => asset.status === "deprecated").length },
      { label: "Primary source of truth assets", value: data.assets.filter((asset) => asset.source_of_truth_level === "primary").length }
    ];
  }, [data]);

  const recentUpdates = useMemo(() => {
    const records = [
      ...data.entries.map((item) => ({ label: item.title, type: "Entry", updated_at: item.updated_at })),
      ...data.assets.map((item) => ({ label: item.asset_name, type: "Asset", updated_at: item.updated_at })),
      ...data.metrics.map((item) => ({ label: item.metric_name, type: "Metric", updated_at: item.updated_at })),
      ...data.fields.map((item) => ({ label: item.field_name, type: "Field", updated_at: item.updated_at }))
    ];
    return records.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)).slice(0, 8);
  }, [data]);

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace">
        Create or select a workspace before documenting Axium Knowledge.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Axium Knowledge</p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">Workspace knowledge layer</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Document what data exists, where it lives, how metrics are defined and which datasets can safely be compared for {activeWorkspace.name}.
          </p>
        </div>
        <button
          onClick={loadKnowledge}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-primary transition hover:border-secondary"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto border-b border-line">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  active ? "border-secondary text-primary" : "border-transparent text-slate-500 hover:text-primary"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {message ? <p className="rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}
      {isLoading ? <p className="text-sm text-slate-600">Loading Axium Knowledge...</p> : null}

      {activeTab === "overview" ? (
        <OverviewPanel stats={stats} recentUpdates={recentUpdates} entries={data.entries} assets={data.assets} />
      ) : (
        <SectionPanel
          sectionKey={activeTab}
          config={sectionConfigs[activeTab]}
          records={data[activeTab]}
          allData={data}
          form={forms[activeTab]}
          filters={filters[activeTab]}
          search={search[activeTab]}
          editingId={editing[activeTab]}
          selectedRecord={selected[activeTab]}
          setFieldValue={(name, value) => {
            setForms((current) => ({
              ...current,
              [activeTab]: {
                ...current[activeTab],
                [name]: value
              }
            }));
          }}
          setFilterValue={(name, value) => {
            setFilters((current) => ({
              ...current,
              [activeTab]: {
                ...current[activeTab],
                [name]: value
              }
            }));
          }}
          setSearchValue={(value) => setSearch((current) => ({ ...current, [activeTab]: value }))}
          onSubmit={(event) => submitForm(event, activeTab)}
          onCancelEdit={() => cancelEdit(activeTab)}
          onEdit={(record) => startEdit(activeTab, record)}
          onDelete={(record) => deleteRecord(activeTab, record)}
          onSelect={(record) => setSelected((current) => ({ ...current, [activeTab]: record }))}
        />
      )}
    </div>
  );

  async function submitForm(event: FormEvent<HTMLFormElement>, sectionKey: SectionKey) {
    event.preventDefault();
    if (!activeWorkspace) {
      return;
    }
    const config = sectionConfigs[sectionKey];
    const editingId = editing[sectionKey];
    const payload = {
      workspace_id: activeWorkspace.id,
      ...serializeForm(forms[sectionKey], config.fields)
    };

    const response = await fetch(editingId ? `${config.listPath}/${editingId}` : config.createPath, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || `Could not save ${config.label}.`);
      return;
    }

    setMessage(editingId ? "Axium Knowledge item updated." : "Axium Knowledge item created.");
    setForms((current) => ({ ...current, [sectionKey]: buildInitialForm(sectionKey) }));
    setEditing((current) => ({ ...current, [sectionKey]: null }));
    await loadKnowledge();
  }

  function startEdit(sectionKey: SectionKey, record: KnowledgeRecord) {
    setEditing((current) => ({ ...current, [sectionKey]: record.id }));
    setSelected((current) => ({ ...current, [sectionKey]: record }));
    setForms((current) => ({ ...current, [sectionKey]: recordToForm(record, sectionConfigs[sectionKey].fields) }));
  }

  function cancelEdit(sectionKey: SectionKey) {
    setEditing((current) => ({ ...current, [sectionKey]: null }));
    setForms((current) => ({ ...current, [sectionKey]: buildInitialForm(sectionKey) }));
  }

  async function deleteRecord(sectionKey: SectionKey, record: KnowledgeRecord) {
    const config = sectionConfigs[sectionKey];
    const response = await fetch(`${config.listPath}/${record.id}`, { method: "DELETE" });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || `Could not delete ${config.label}.`);
      return;
    }

    setMessage("Axium Knowledge item deleted.");
    setSelected((current) => ({ ...current, [sectionKey]: null }));
    await loadKnowledge();
  }
}

function OverviewPanel({
  stats,
  recentUpdates,
  entries,
  assets
}: {
  stats: Array<{ label: string; value: number }>;
  recentUpdates: Array<{ label: string; type: string; updated_at: string }>;
  entries: KnowledgeEntry[];
  assets: DataAsset[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-primary">{stat.value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">Recent knowledge updates</h2>
          <div className="mt-4 space-y-3">
            {recentUpdates.length ? (
              recentUpdates.map((item) => (
                <div key={`${item.type}-${item.label}-${item.updated_at}`} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                  <span className="flex-none text-xs text-slate-500">{formatDate(item.updated_at)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-500">No Axium Knowledge items documented yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">What Axium can use today</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <p>
              Data assets documented: <strong className="text-primary">{assets.length}</strong>
            </p>
            <p>
              Open or active knowledge issues:{" "}
              <strong className="text-primary">{entries.filter((entry) => ["active", "open"].includes(entry.status)).length}</strong>
            </p>
            <p>
              Primary sources of truth:{" "}
              <strong className="text-primary">{assets.filter((asset) => asset.source_of_truth_level === "primary").length}</strong>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionPanel({
  sectionKey,
  config,
  records,
  allData,
  form,
  filters,
  search,
  editingId,
  selectedRecord,
  setFieldValue,
  setFilterValue,
  setSearchValue,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
  onSelect
}: {
  sectionKey: SectionKey;
  config: SectionConfig;
  records: KnowledgeRecord[];
  allData: KnowledgeState;
  form: FormValues;
  filters: Record<string, string>;
  search: string;
  editingId: string | null;
  selectedRecord: KnowledgeRecord | null;
  setFieldValue: (name: string, value: FormValue) => void;
  setFilterValue: (name: string, value: string) => void;
  setSearchValue: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onEdit: (record: KnowledgeRecord) => void;
  onDelete: (record: KnowledgeRecord) => void;
  onSelect: (record: KnowledgeRecord) => void;
}) {
  const filteredRecords = useMemo(() => filterRecords(records, filters, search), [records, filters, search]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section className="min-w-0 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-primary">{config.label}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{config.description}</p>
          {sectionKey === "relationships" ? (
            <p className="mt-2 text-xs text-slate-500">This is a simple MVP map view. TODO: add a draggable visual mind map graph later.</p>
          ) : null}
        </div>

        {sectionKey === "relationships" ? <RelationshipMapPreview data={allData} /> : null}

        <div className="grid gap-3 rounded-xl border border-line bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-sm outline-none focus:border-secondary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {config.filters.map((filter) => (
              <FilterControl
                key={filter.name}
                filter={filter}
                value={filters[filter.name] ?? ""}
                data={allData}
                onChange={(value) => setFilterValue(filter.name, value)}
              />
            ))}
          </div>
        </div>

        {!filteredRecords.length ? (
          <EmptyState title={`No ${config.label.toLowerCase()} found`}>
            Create the first item or clear the current filters.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <article key={record.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <button onClick={() => onSelect(record)} className="min-w-0 text-left">
                    <h3 className="truncate text-base font-semibold text-primary">{getRecordTitle(sectionKey, record, allData)}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{getRecordDescription(record)}</p>
                  </button>
                  <div className="flex flex-none items-center gap-2">
                    {getStatus(record) ? <Badge>{getStatus(record)}</Badge> : null}
                    {"confidence_level" in record && record.confidence_level ? <Badge tone="blue">{record.confidence_level}</Badge> : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {config.summaryFields.map((field) => (
                    <span key={field} className="rounded-full bg-panel px-3 py-1">
                      {formatLabel(field)}: {formatRecordValue(field, recordValue(record, field), allData)}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onEdit(record)} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button onClick={() => onDelete(record)} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">{editingId ? `Edit ${config.label}` : `Create ${config.label}`}</p>
              <p className="mt-1 text-xs text-slate-500">Saved only to the active workspace.</p>
            </div>
            {editingId ? (
              <button type="button" onClick={onCancelEdit} className="rounded-lg border border-line p-2 text-slate-500 transition hover:border-secondary hover:text-primary" aria-label="Cancel edit">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {config.fields.map((field) => (
              <FormFieldControl
                key={field.name}
                field={field}
                value={form[field.name]}
                form={form}
                data={allData}
                onChange={(value) => setFieldValue(field.name, value)}
              />
            ))}
          </div>
          <button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#001F5F]">
            {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Save changes" : "Create item"}
          </button>
        </form>

        {selectedRecord ? (
          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-primary">Detail view</h3>
            <div className="mt-4 space-y-3">
              {config.fields.map((field) => (
                <div key={field.name} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {formatRecordValue(field.name, recordValue(selectedRecord, field.name), allData) || "Not documented"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function FilterControl({
  filter,
  value,
  data,
  onChange
}: {
  filter: FilterConfig;
  value: string;
  data: KnowledgeState;
  onChange: (value: string) => void;
}) {
  const options = filter.name === "source_asset_id" ? data.assets.map((asset) => ({ value: asset.id, label: asset.asset_name })) : (filter.options ?? []).map((item) => ({ value: item, label: formatLabel(item) }));

  if (filter.kind === "select" || filter.options || filter.name === "source_asset_id") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-line bg-white px-3 text-sm text-slate-700 outline-none focus:border-secondary">
        <option value="">All {filter.label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={filter.label}
      className="h-10 w-40 rounded-lg border border-line px-3 text-sm outline-none focus:border-secondary"
    />
  );
}

function FormFieldControl({
  field,
  value,
  form,
  data,
  onChange
}: {
  field: FieldConfig;
  value: FormValue | undefined;
  form: FormValues;
  data: KnowledgeState;
  onChange: (value: FormValue) => void;
}) {
  const normalizedValue = value ?? initialValueForField(field);
  const commonClass = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-secondary";

  if (field.kind === "textarea") {
    return (
      <label className={field.full ? "block" : "block"}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          value={String(normalizedValue ?? "")}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          required={field.required}
          placeholder={field.placeholder}
          className={`${commonClass} resize-none`}
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select value={String(normalizedValue ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required} className={`${commonClass} bg-white`}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "asset") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select value={String(normalizedValue ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required} className={`${commonClass} bg-white`}>
          <option value="">Select asset</option>
          {data.assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.asset_name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "node_id") {
    const typeField = field.name === "from_id" ? "from_type" : "to_type";
    const nodeType = String(form[typeField] || "data_asset") as RelationshipNodeType;
    const options = getNodeOptions(nodeType, data);
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select value={String(normalizedValue ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required} className={`${commonClass} bg-white`}>
          <option value="">Select item</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={Boolean(normalizedValue)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#1775DA]" />
        {field.label}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input
        type={field.kind === "date" ? "date" : "text"}
        value={Array.isArray(normalizedValue) ? normalizedValue.join(", ") : String(normalizedValue ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        placeholder={field.placeholder}
        className={commonClass}
      />
    </label>
  );
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "blue" }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === "blue" ? "bg-[#E8F3FF] text-secondary" : "bg-panel text-slate-600"}`}>
      {formatLabel(children)}
    </span>
  );
}

function RelationshipMapPreview({ data }: { data: KnowledgeState }) {
  if (!data.relationships.length) {
    return (
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-primary">Relationship map</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create relationships to see how Axium Knowledge items connect.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-primary">Relationship map</h3>
      <div className="mt-4 space-y-3">
        {data.relationships.slice(0, 8).map((relationship) => (
          <div key={relationship.id} className="grid gap-3 rounded-lg border border-line bg-panel p-3 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
            <MapNode label={getNodeLabel(relationship.from_type, relationship.from_id, data)} type={relationship.from_type} />
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-secondary">
                {formatLabel(relationship.relationship_type)}
              </span>
            </div>
            <MapNode label={getNodeLabel(relationship.to_type, relationship.to_id, data)} type={relationship.to_type} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MapNode({ label, type }: { label: string; type: RelationshipNodeType }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white px-3 py-2">
      <p className="truncate font-semibold text-primary">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{formatLabel(type)}</p>
    </div>
  );
}

function buildInitialForms() {
  return Object.fromEntries(sectionKeys.map((sectionKey) => [sectionKey, buildInitialForm(sectionKey)])) as Record<SectionKey, FormValues>;
}

function buildInitialFilters() {
  return Object.fromEntries(sectionKeys.map((sectionKey) => [sectionKey, {}])) as Record<SectionKey, Record<string, string>>;
}

function buildInitialSearch() {
  return Object.fromEntries(sectionKeys.map((sectionKey) => [sectionKey, ""])) as Record<SectionKey, string>;
}

function buildEmptyRecord<T>(value: T) {
  return Object.fromEntries(sectionKeys.map((sectionKey) => [sectionKey, value])) as Record<SectionKey, T>;
}

function buildInitialForm(sectionKey: SectionKey) {
  return Object.fromEntries(sectionConfigs[sectionKey].fields.map((field) => [field.name, initialValueForField(field)])) as FormValues;
}

function initialValueForField(field: FieldConfig): FormValue {
  if (field.kind === "checkbox") {
    return false;
  }
  if (field.kind === "select") {
    return field.options?.[0] ?? "";
  }
  if (field.kind === "tags") {
    return "";
  }
  return "";
}

function serializeForm(form: FormValues, fields: FieldConfig[]) {
  const payload: Record<string, FormValue | string[]> = {};
  for (const field of fields) {
    const value = form[field.name];
    if (field.kind === "tags") {
      payload[field.name] = Array.isArray(value)
        ? value
        : String(value ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      continue;
    }
    if (field.kind === "checkbox") {
      payload[field.name] = Boolean(value);
      continue;
    }
    payload[field.name] = value === "" && !field.required ? null : value ?? null;
  }
  return payload;
}

function recordToForm(record: KnowledgeRecord, fields: FieldConfig[]) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = recordValue(record, field.name);
      if (field.kind === "tags") {
        return [field.name, Array.isArray(value) ? value.join(", ") : value ?? ""];
      }
      if (field.kind === "checkbox") {
        return [field.name, Boolean(value)];
      }
      return [field.name, value ?? initialValueForField(field)];
    })
  ) as FormValues;
}

function filterRecords(records: KnowledgeRecord[], filters: Record<string, string>, search: string) {
  const query = search.trim().toLowerCase();
  return records.filter((record) => {
    const matchesSearch = !query || JSON.stringify(record).toLowerCase().includes(query);
    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      if (!value) {
        return true;
      }
      const actual = recordValue(record, key);
      if (Array.isArray(actual)) {
        return actual.map(String).some((item) => item.toLowerCase().includes(value.toLowerCase()));
      }
      return String(actual ?? "").toLowerCase().includes(value.toLowerCase());
    });
    return matchesSearch && matchesFilters;
  });
}

function recordValue(record: KnowledgeRecord, field: string): unknown {
  return (record as unknown as Record<string, unknown>)[field];
}

function getStatus(record: KnowledgeRecord) {
  const value = recordValue(record, "status");
  return typeof value === "string" ? value : "";
}

function getRecordTitle(sectionKey: SectionKey, record: KnowledgeRecord, data: KnowledgeState) {
  if (sectionKey === "relationships") {
    const relationship = record as KnowledgeRelationship;
    return `${getNodeLabel(relationship.from_type, relationship.from_id, data)} ${formatLabel(relationship.relationship_type)} ${getNodeLabel(
      relationship.to_type,
      relationship.to_id,
      data
    )}`;
  }

  return String(recordValue(record, sectionConfigs[sectionKey].titleField) ?? "Untitled");
}

function getRecordDescription(record: KnowledgeRecord) {
  for (const field of ["description", "business_definition", "known_limitations", "known_issues", "use_case", "warning"]) {
    const value = recordValue(record, field);
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "No description documented yet.";
}

function formatRecordValue(field: string, value: unknown, data: KnowledgeState) {
  if (field.endsWith("_asset_id") || field === "source_asset_id") {
    return assetName(String(value ?? ""), data);
  }
  if ((field === "from_id" || field === "to_id") && typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return labelLikeFields.has(field) ? formatLabel(value) : value;
  }
  return value === null || value === undefined ? "" : String(value);
}

const labelLikeFields = new Set([
  "type",
  "status",
  "confidence_level",
  "asset_type",
  "source_platform",
  "source_of_truth_level",
  "aggregation_type",
  "grain",
  "field_type",
  "join_quality",
  "pii_level",
  "relationship_type",
  "from_type",
  "to_type",
  "join_type"
]);

function assetName(id: string, data: KnowledgeState) {
  return data.assets.find((asset) => asset.id === id)?.asset_name ?? id;
}

function getNodeOptions(nodeType: RelationshipNodeType, data: KnowledgeState) {
  switch (nodeType) {
    case "data_asset":
      return data.assets.map((item) => ({ id: item.id, label: item.asset_name }));
    case "metric":
      return data.metrics.map((item) => ({ id: item.id, label: item.metric_name }));
    case "field":
      return data.fields.map((item) => ({ id: item.id, label: item.field_name }));
    case "knowledge_entry":
      return data.entries.map((item) => ({ id: item.id, label: item.title }));
  }
}

function getNodeLabel(nodeType: RelationshipNodeType, id: string, data: KnowledgeState) {
  return getNodeOptions(nodeType, data).find((item) => item.id === id)?.label ?? `${formatLabel(nodeType)} ${id.slice(0, 8)}`;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bGA4\b/i, "GA4");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
