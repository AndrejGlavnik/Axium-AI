import { type NextRequest } from "next/server";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/knowledge/api";
import { fieldUpdateSchema } from "@/lib/knowledge/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateWorkspaceRecord(request, context, "fields_catalog", fieldUpdateSchema);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteWorkspaceRecord(request, context, "fields_catalog");
}
