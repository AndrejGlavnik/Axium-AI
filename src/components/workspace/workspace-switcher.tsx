"use client";

import { useWorkspace } from "@/components/workspace/workspace-provider";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoading } = useWorkspace();

  if (isLoading) {
    return <div className="h-10 rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-500">Loading...</div>;
  }

  if (!workspaces.length) {
    return <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-500">No workspace</div>;
  }

  return (
    <select
      value={activeWorkspaceId ?? ""}
      onChange={(event) => setActiveWorkspaceId(event.target.value)}
      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-primary outline-none focus:border-secondary"
      aria-label="Active workspace"
    >
      {workspaces.map((workspace) => (
        <option key={workspace.id} value={workspace.id}>
          {workspace.name}
        </option>
      ))}
    </select>
  );
}
