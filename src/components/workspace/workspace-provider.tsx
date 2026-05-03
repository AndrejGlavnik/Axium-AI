"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Workspace, WorkspaceRole } from "@/types/database";

export type WorkspaceWithRole = Workspace & {
  role: WorkspaceRole;
};

type WorkspaceContextValue = {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshWorkspaces: () => Promise<void>;
  setActiveWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshWorkspaces() {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/workspaces");
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not load workspaces.");
      setIsLoading(false);
      return;
    }

    const loaded = payload.workspaces as WorkspaceWithRole[];
    setWorkspaces(loaded);

    const stored = window.localStorage.getItem("active_workspace_id");
    const nextActive = loaded.find((workspace) => workspace.id === stored)?.id ?? loaded[0]?.id ?? null;
    setActiveWorkspaceIdState(nextActive);
    if (nextActive) {
      window.localStorage.setItem("active_workspace_id", nextActive);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void refreshWorkspaces();
  }, []);

  function setActiveWorkspaceId(workspaceId: string) {
    setActiveWorkspaceIdState(workspaceId);
    window.localStorage.setItem("active_workspace_id", workspaceId);
  }

  async function createWorkspace(name: string) {
    setError(null);
    const response = await fetch("/api/workspaces/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not create workspace.");
      return;
    }

    await refreshWorkspaces();
    if (payload.workspace?.id) {
      setActiveWorkspaceId(payload.workspace.id);
    }
  }

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;
    return {
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      isLoading,
      error,
      refreshWorkspaces,
      setActiveWorkspaceId,
      createWorkspace
    };
  }, [workspaces, activeWorkspaceId, isLoading, error]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return value;
}
