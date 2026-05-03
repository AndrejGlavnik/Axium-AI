"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-panel lg:grid lg:grid-cols-[18rem_1fr]">
        <Sidebar />
        <main className="min-w-0 p-5 lg:p-8">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
