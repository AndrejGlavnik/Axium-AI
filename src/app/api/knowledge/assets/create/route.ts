import { type NextRequest } from "next/server";
import { createWorkspaceRecord } from "@/lib/knowledge/api";
import { dataAssetCreateSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  return createWorkspaceRecord(request, "data_assets", dataAssetCreateSchema);
}
