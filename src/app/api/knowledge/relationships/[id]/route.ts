import { type NextRequest } from "next/server";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/knowledge/api";
import { relationshipUpdateSchema } from "@/lib/knowledge/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateWorkspaceRecord(request, context, "knowledge_relationships", relationshipUpdateSchema);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteWorkspaceRecord(request, context, "knowledge_relationships");
}
