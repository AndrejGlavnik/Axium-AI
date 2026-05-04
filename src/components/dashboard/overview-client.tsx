"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Files, MessageSquareText, PlugZap, UsersRound } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { EmptyState } from "@/components/dashboard/empty-state";

const cards = [
  {
    title: "Upload files",
    copy: "Add documents and datasets to the selected workspace.",
    href: "/dashboard/files",
    icon: Files
  },
  {
    title: "Ask questions",
    copy: "Chat with Axium using files, schemas and Axium Knowledge.",
    href: "/dashboard/chat",
    icon: MessageSquareText
  },
  {
    title: "Connect sources",
    copy: "Document Datorama, Databox, GA4, BigQuery, Sheets and API connections.",
    href: "/dashboard/connections",
    icon: PlugZap
  },
  {
    title: "Build Axium Knowledge",
    copy: "Document assets, metrics, fields, relationships and cross-reference rules.",
    href: "/dashboard/knowledge",
    icon: BookOpenText
  },
  {
    title: "Manage workspaces",
    copy: "Create workspaces and switch active context.",
    href: "/dashboard/workspaces",
    icon: UsersRound
  }
];

export function OverviewClient() {
  const { activeWorkspace, isLoading } = useWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-secondary">Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold text-primary">Axium workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          {activeWorkspace ? `Active workspace: ${activeWorkspace.name}` : "Create a workspace to begin."}
        </p>
      </div>

      {!isLoading && !activeWorkspace ? (
        <EmptyState title="Create your first workspace">
          Workspaces keep files, chat threads and analysis runs isolated for each team or client.
        </EmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-xl border border-line bg-white p-6 shadow-sm transition hover:shadow-soft">
            <card.icon className="h-6 w-6 text-secondary" />
            <h2 className="mt-4 text-lg font-semibold text-primary">{card.title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{card.copy}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
              Open <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
