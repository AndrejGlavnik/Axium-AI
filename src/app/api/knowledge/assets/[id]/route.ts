import { type NextRequest } from "next/server";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/knowledge/api";
import { dataAssetUpdateSchema } from "@/lib/knowledge/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateWorkspaceRecord(request, context, "data_assets", dataAssetUpdateSchema);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteWorkspaceRecord(request, context, "data_assets");
}
