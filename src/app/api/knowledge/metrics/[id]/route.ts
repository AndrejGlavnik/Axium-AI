import { type NextRequest } from "next/server";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/knowledge/api";
import { metricUpdateSchema } from "@/lib/knowledge/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateWorkspaceRecord(request, context, "metrics_catalog", metricUpdateSchema);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteWorkspaceRecord(request, context, "metrics_catalog");
}
