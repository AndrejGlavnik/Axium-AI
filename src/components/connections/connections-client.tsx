"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  DatabaseZap,
  KeyRound,
  Link2,
  ListTree,
  Pencil,
  PlusCircle,
  PlugZap,
  RefreshCcw,
  Save,
  Trash2,
  XCircle
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import {
  connectionAuthTypes,
  connectionProviders,
  connectionResourceStatuses,
  connectionResourceTypes,
  connectionStatuses,
  connectionTemplates,
  connectionTypes,
  syncFrequencies,
  type ConnectionProvider
} from "@/lib/connections/constants";
import type { Connection, ConnectionResource, DataAsset } from "@/types/database";

type ConnectionForm = {
  name: string;
  provider: ConnectionProvider;
  connection_type: string;
  auth_type: string;
  status: string;
  base_url: string;
  account_identifier: string;
  documentation_url: string;
  description: string;
  owner: string;
  sync_frequency: string;
  scopes: string;
  linked_asset_ids: string[];
  notes: string;
  credential_label: string;
  credential_value: string;
};

type ResourceForm = {
  resource_name: string;
  resource_type: string;
  external_id: string;
  path: string;
  description: string;
  status: string;
  linked_asset_id: string;
};

const initialForm: ConnectionForm = {
  name: "",
  provider: "API",
  connection_type: "api_key",
  auth_type: "api_key",
  status: "draft",
  base_url: "",
  account_identifier: "",
  documentation_url: "",
  description: "",
  owner: "",
  sync_frequency: "manual",
  scopes: "",
  linked_asset_ids: [],
  notes: "",
  credential_label: "",
  credential_value: ""
};

const initialResourceForm: ResourceForm = {
  resource_name: "",
  resource_type: "dashboard",
  external_id: "",
  path: "",
  description: "",
  status: "active",
  linked_asset_id: ""
};

export function ConnectionsClient() {
  const { activeWorkspace } = useWorkspace();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [resources, setResources] = useState<Record<string, ConnectionResource[]>>({});
  const [assets, setAssets] = useState<DataAsset[]>([]);
  const [form, setForm] = useState<ConnectionForm>(initialForm);
  const [resourceForm, setResourceForm] = useState<ResourceForm>(initialResourceForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resourceFormConnectionId, setResourceFormConnectionId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ConnectionProvider>("API");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const stats = useMemo(() => {
    return [
      { label: "Connected", value: connections.filter((item) => item.status === "connected").length },
      { label: "Needs credentials", value: connections.filter((item) => item.status === "needs_credentials").length },
      { label: "API connections", value: connections.filter((item) => item.connection_type === "api_key").length },
      { label: "Linked assets", value: new Set(connections.flatMap((item) => item.linked_asset_ids)).size },
      { label: "Resources mapped", value: Object.values(resources).reduce((count, items) => count + items.length, 0) }
    ];
  }, [connections, resources]);

  async function loadConnections() {
    if (!activeWorkspace) {
      setConnections([]);
      setAssets([]);
      return;
    }

    setIsLoading(true);
    setMessage("");
    const [connectionsResponse, assetsResponse] = await Promise.all([
      fetch(`/api/connections?workspace_id=${activeWorkspace.id}`),
      fetch(`/api/knowledge/assets?workspace_id=${activeWorkspace.id}`)
    ]);
    const connectionsPayload = await connectionsResponse.json();
    const assetsPayload = await assetsResponse.json();

    if (connectionsResponse.ok) {
      const loadedConnections = (connectionsPayload.connections ?? []) as Connection[];
      setConnections(loadedConnections);
      await loadResources(loadedConnections);
    } else {
      setMessage(connectionsPayload.error || "Could not load connections.");
    }

    if (assetsResponse.ok) {
      setAssets(assetsPayload.assets ?? []);
    }

    setIsLoading(false);
  }

  async function loadResources(loadedConnections: Connection[]) {
    if (!activeWorkspace || !loadedConnections.length) {
      setResources({});
      return;
    }

    const pairs = await Promise.all(
      loadedConnections.map(async (connection) => {
        const response = await fetch(`/api/connections/${connection.id}/resources?workspace_id=${activeWorkspace.id}`);
        const payload = await response.json();
        return [connection.id, response.ok ? payload.resources ?? [] : []] as const;
      })
    );
    setResources(Object.fromEntries(pairs));
  }

  useEffect(() => {
    void loadConnections();
  }, [activeWorkspace?.id]);

  function applyTemplate(provider: ConnectionProvider) {
    const template = connectionTemplates.find((item) => item.provider === provider);
    setSelectedProvider(provider);
    setEditingId(null);
    setForm({
      ...initialForm,
      provider,
      name: provider === "API" ? "Client API connection" : `${provider} connection`,
      connection_type: template?.connection_type ?? "api_key",
      auth_type: template?.auth_type ?? "api_key",
      description: template?.description ?? ""
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) {
      return;
    }

    const payload = {
      workspace_id: activeWorkspace.id,
      ...form,
      scopes: form.scopes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    const response = await fetch(editingId ? `/api/connections/${editingId}` : "/api/connections/create", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not save connection.");
      return;
    }

    setMessage(editingId ? "Connection updated." : "Connection created.");
    setEditingId(null);
    setForm(initialForm);
    await loadConnections();
  }

  function startEdit(connection: Connection) {
    setEditingId(connection.id);
    setSelectedProvider(connection.provider);
    setForm({
      name: connection.name,
      provider: connection.provider,
      connection_type: connection.connection_type,
      auth_type: connection.auth_type,
      status: connection.status,
      base_url: connection.base_url ?? "",
      account_identifier: connection.account_identifier ?? "",
      documentation_url: connection.documentation_url ?? "",
      description: connection.description ?? "",
      owner: connection.owner ?? "",
      sync_frequency: connection.sync_frequency,
      scopes: connection.scopes.join(", "),
      linked_asset_ids: connection.linked_asset_ids,
      notes: connection.notes ?? "",
      credential_label: "",
      credential_value: ""
    });
  }

  async function deleteConnection(connection: Connection) {
    const response = await fetch(`/api/connections/${connection.id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not delete connection.");
      return;
    }
    setMessage("Connection deleted.");
    await loadConnections();
  }

  async function testConnection(connection: Connection) {
    const response = await fetch(`/api/connections/${connection.id}/test`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not test connection.");
      return;
    }
    setMessage(body.notes || "Connection tested.");
    await loadConnections();
  }

  async function discoverConnection(connection: Connection) {
    const response = await fetch(`/api/connections/${connection.id}/discover`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not discover connection resources.");
      return;
    }
    setMessage(body.notes || "Connection resources discovered.");
    await loadConnections();
  }

  function startAddResource(connection: Connection) {
    setResourceFormConnectionId(connection.id);
    setEditingResourceId(null);
    setResourceForm({
      ...initialResourceForm,
      resource_type: suggestedResourceType(connection.provider)
    });
  }

  function startEditResource(connectionId: string, resource: ConnectionResource) {
    setResourceFormConnectionId(connectionId);
    setEditingResourceId(resource.id);
    setResourceForm({
      resource_name: resource.resource_name,
      resource_type: resource.resource_type,
      external_id: resource.external_id ?? "",
      path: resource.path ?? "",
      description: resource.description ?? "",
      status: resource.status,
      linked_asset_id: resource.linked_asset_id ?? ""
    });
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !resourceFormConnectionId) {
      return;
    }

    const payload = {
      workspace_id: activeWorkspace.id,
      ...resourceForm,
      linked_asset_id: resourceForm.linked_asset_id || null
    };
    const endpoint = editingResourceId
      ? `/api/connections/${resourceFormConnectionId}/resources/${editingResourceId}`
      : `/api/connections/${resourceFormConnectionId}/resources/create`;
    const response = await fetch(endpoint, {
      method: editingResourceId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not save connection resource.");
      return;
    }

    setMessage(editingResourceId ? "Connection resource updated." : "Connection resource added.");
    setResourceFormConnectionId(null);
    setEditingResourceId(null);
    setResourceForm(initialResourceForm);
    await loadConnections();
  }

  async function deleteResource(connectionId: string, resourceId: string) {
    const response = await fetch(`/api/connections/${connectionId}/resources/${resourceId}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not delete connection resource.");
      return;
    }

    setMessage("Connection resource deleted.");
    await loadConnections();
  }

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace">
        Create or select a workspace before adding connections.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Connections</p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">Connected data sources</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Select a source, document the connection details and link it to Axium Knowledge assets for {activeWorkspace.name}.
          </p>
        </div>
        <button
          onClick={loadConnections}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-primary transition hover:border-secondary"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {message ? <p className="rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}
      {isLoading ? <p className="text-sm text-slate-600">Loading connections...</p> : null}

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Choose a connection type</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {connectionTemplates.map((template) => (
            <button
              key={template.provider}
              onClick={() => applyTemplate(template.provider)}
              className={`rounded-xl border p-4 text-left transition ${
                selectedProvider === template.provider ? "border-secondary bg-[#E8F3FF]" : "border-line bg-white hover:border-secondary"
              }`}
            >
              <DatabaseZap className="h-5 w-5 text-secondary" />
              <p className="mt-3 font-semibold text-primary">{template.provider}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{template.description}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[26rem_1fr]">
        <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">{editingId ? "Edit connection" : "Add connection"}</h2>
              <p className="mt-1 text-xs text-slate-500">Credentials are write-only and never shown again.</p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                className="rounded-lg border border-line p-2 text-slate-500 transition hover:border-secondary hover:text-primary"
                aria-label="Cancel edit"
              >
                <XCircle className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <Input label="Connection name" value={form.name} onChange={(value) => setFormValue("name", value)} required />
            <Select label="Provider" value={form.provider} options={connectionProviders} onChange={(value) => setFormValue("provider", value)} />
            <Select label="Connection type" value={form.connection_type} options={connectionTypes} onChange={(value) => setFormValue("connection_type", value)} />
            <Select label="Auth type" value={form.auth_type} options={connectionAuthTypes} onChange={(value) => setFormValue("auth_type", value)} />
            <Input label="Base URL or source URL" value={form.base_url} onChange={(value) => setFormValue("base_url", value)} />
            <Input label="Account, property, dataset or dashboard ID" value={form.account_identifier} onChange={(value) => setFormValue("account_identifier", value)} />
            <Input label="Documentation URL" value={form.documentation_url} onChange={(value) => setFormValue("documentation_url", value)} />
            <Input label="Owner" value={form.owner} onChange={(value) => setFormValue("owner", value)} />
            <Select label="Sync frequency" value={form.sync_frequency} options={syncFrequencies} onChange={(value) => setFormValue("sync_frequency", value)} />
            <Select label="Status" value={form.status} options={connectionStatuses} onChange={(value) => setFormValue("status", value)} />
            <AssetSelect assets={assets} selected={form.linked_asset_ids} onChange={(value) => setFormValue("linked_asset_ids", value)} />
            <Textarea label="Description" value={form.description} onChange={(value) => setFormValue("description", value)} />
            <Input label="Scopes or permissions" value={form.scopes} onChange={(value) => setFormValue("scopes", value)} placeholder="read:reports, read:metadata" />
            <Textarea label="Notes" value={form.notes} onChange={(value) => setFormValue("notes", value)} />
            <Input label="Credential label" value={form.credential_label} onChange={(value) => setFormValue("credential_label", value)} placeholder="Production API key" />
            <Input label="Credential value" value={form.credential_value} onChange={(value) => setFormValue("credential_value", value)} type="password" />
          </div>

          <button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#001F5F]">
            {editingId ? <Save className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
            {editingId ? "Save connection" : "Add connection"}
          </button>
        </form>

        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">Everything connected</h2>
              <p className="mt-1 text-sm text-slate-600">Workspace connection inventory and linked Axium Knowledge assets.</p>
            </div>
          </div>

          {!connections.length ? (
            <div className="mt-5">
              <EmptyState title="No connections yet">
                Choose a connection type and document the first client source.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {connections.map((connection) => (
                <article key={connection.id} className="rounded-xl border border-line bg-panel p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-primary">{connection.name}</h3>
                        <StatusBadge status={connection.status} />
                        {connection.has_credentials ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-secondary">
                            <KeyRound className="h-3 w-3" />
                            Credential stored
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{connection.description || "No description documented."}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <Pill label="Provider" value={connection.provider} />
                        <Pill label="Type" value={connection.connection_type} />
                        <Pill label="Auth" value={connection.auth_type} />
                        <Pill label="Sync" value={connection.sync_frequency} />
                        {connection.account_identifier ? <Pill label="Account" value={connection.account_identifier} /> : null}
                      </div>
                      {connection.linked_asset_ids.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {connection.linked_asset_ids.map((assetId) => (
                            <span key={assetId} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-line">
                              <Link2 className="h-3 w-3" />
                              {assetName(assetId, assets)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {resourceFormConnectionId === connection.id ? (
                        <ResourceEditor
                          assets={assets}
                          form={resourceForm}
                          isEditing={Boolean(editingResourceId)}
                          onCancel={() => {
                            setResourceFormConnectionId(null);
                            setEditingResourceId(null);
                            setResourceForm(initialResourceForm);
                          }}
                          onChange={setResourceFormValue}
                          onSubmit={saveResource}
                        />
                      ) : null}
                      <ConnectionResources
                        assets={assets}
                        connectionId={connection.id}
                        resources={resources[connection.id] ?? []}
                        onDelete={deleteResource}
                        onEdit={startEditResource}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => testConnection(connection)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Test
                      </button>
                      <button onClick={() => startEdit(connection)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button onClick={() => discoverConnection(connection)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary">
                        <ListTree className="h-3.5 w-3.5" />
                        Discover
                      </button>
                      <button onClick={() => startAddResource(connection)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:border-secondary">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add resource
                      </button>
                      <button onClick={() => deleteConnection(connection)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  function setFormValue<K extends keyof ConnectionForm>(key: K, value: ConnectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setResourceFormValue<K extends keyof ResourceForm>(key: K, value: ResourceForm[K]) {
    setResourceForm((current) => ({ ...current, [key]: value }));
  }
}

function ResourceEditor({
  assets,
  form,
  isEditing,
  onCancel,
  onChange,
  onSubmit
}: {
  assets: DataAsset[];
  form: ResourceForm;
  isEditing: boolean;
  onCancel: () => void;
  onChange: <K extends keyof ResourceForm>(key: K, value: ResourceForm[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-lg border border-line bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-primary">{isEditing ? "Edit connected resource" : "Add connected resource"}</p>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-slate-600">
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Input label="Resource name" value={form.resource_name} onChange={(value) => onChange("resource_name", value)} required />
        <Select label="Resource type" value={form.resource_type} options={connectionResourceTypes} onChange={(value) => onChange("resource_type", value)} />
        <Input label="External ID" value={form.external_id} onChange={(value) => onChange("external_id", value)} />
        <Input label="Path or URL" value={form.path} onChange={(value) => onChange("path", value)} />
        <Select label="Status" value={form.status} options={connectionResourceStatuses} onChange={(value) => onChange("status", value)} />
        <SingleAssetSelect assets={assets} value={form.linked_asset_id} onChange={(value) => onChange("linked_asset_id", value)} />
      </div>
      <div className="mt-3">
        <Textarea label="Description" value={form.description} onChange={(value) => onChange("description", value)} />
      </div>
      <button className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-[#001F5F]">
        <Save className="h-3.5 w-3.5" />
        {isEditing ? "Save resource" : "Add resource"}
      </button>
    </form>
  );
}

function ConnectionResources({
  assets,
  connectionId,
  resources,
  onDelete,
  onEdit
}: {
  assets: DataAsset[];
  connectionId: string;
  resources: ConnectionResource[];
  onDelete: (connectionId: string, resourceId: string) => void;
  onEdit: (connectionId: string, resource: ConnectionResource) => void;
}) {
  if (!resources.length) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        No resources mapped yet. Use Discover after adding a URL, account ID or linked Axium assets.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mapped resources</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {resources.map((resource) => (
          <div key={resource.id} className="rounded-lg bg-panel px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-primary">{resource.resource_name}</p>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => onEdit(connectionId, resource)} className="rounded-md border border-line bg-white p-1 text-slate-500 transition hover:border-secondary hover:text-primary" aria-label={`Edit ${resource.resource_name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(connectionId, resource.id)} className="rounded-md border border-line bg-white p-1 text-red-700 transition hover:border-red-300" aria-label={`Delete ${resource.resource_name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{formatLabel(resource.resource_type)}</span>
              <span>{formatLabel(resource.status)}</span>
              {resource.external_id ? <span>{resource.external_id}</span> : null}
              {resource.linked_asset_id ? <span>{assetName(resource.linked_asset_id, assets)}</span> : null}
            </div>
            {resource.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{resource.description}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-secondary"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-secondary"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: never) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as never)}
        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssetSelect({
  assets,
  selected,
  onChange
}: {
  assets: DataAsset[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Linked Axium Knowledge assets</span>
      <select
        multiple
        value={selected}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value))}
        className="mt-1 min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
      >
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.asset_name}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-slate-500">Hold Ctrl/Cmd to select multiple assets.</span>
    </label>
  );
}

function SingleAssetSelect({
  assets,
  value,
  onChange
}: {
  assets: DataAsset[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Linked Axium asset</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
      >
        <option value="">None</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.asset_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const connected = status === "connected";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? "bg-[#E8F3FF] text-secondary" : "bg-white text-slate-600 ring-1 ring-line"}`}>
      {formatLabel(status)}
    </span>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">
      {label}: {formatLabel(value)}
    </span>
  );
}

function assetName(assetId: string, assets: DataAsset[]) {
  return assets.find((asset) => asset.id === assetId)?.asset_name ?? assetId.slice(0, 8);
}

function suggestedResourceType(provider: ConnectionProvider) {
  if (provider === "GA4") {
    return "property";
  }
  if (provider === "BigQuery") {
    return "dataset";
  }
  if (provider === "Google Sheets") {
    return "sheet";
  }
  if (provider === "Datorama" || provider === "Databox") {
    return "dashboard";
  }
  if (provider === "CSV" || provider === "Excel") {
    return "file_export";
  }
  return "api_endpoint";
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bGA4\b/i, "GA4");
}
