"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { EmptyState } from "@/components/dashboard/empty-state";

export function WorkspacesClient() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, createWorkspace, error, isLoading } = useWorkspace();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    await createWorkspace(name);
    setName("");
    setIsCreating(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-secondary">Workspaces</p>
        <h1 className="mt-1 text-3xl font-semibold text-primary">Workspace management</h1>
        <p className="mt-2 text-sm text-slate-600">Every file, chat thread and analysis run is scoped to one workspace.</p>
      </div>

      <form onSubmit={onCreate} className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Workspace name</span>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              placeholder="Finance reporting"
              className="h-11 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-secondary"
            />
            <button
              disabled={isCreating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#001F5F] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "Creating..." : "Create workspace"}
            </button>
          </div>
        </label>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </form>

      {!isLoading && !workspaces.length ? (
        <EmptyState title="No workspaces yet">Create a workspace for a team, client or reporting domain.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setActiveWorkspaceId(workspace.id)}
              className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-soft ${
                activeWorkspaceId === workspace.id ? "border-secondary ring-4 ring-[#1775DA]/10" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-primary">{workspace.name}</h2>
                  <p className="mt-1 text-sm capitalize text-slate-500">{workspace.role}</p>
                </div>
                <span className="rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-secondary">
                  {activeWorkspaceId === workspace.id ? "Active" : "Select"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
