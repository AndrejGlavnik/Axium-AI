import { type NextRequest } from "next/server";
import { createWorkspaceRecord } from "@/lib/knowledge/api";
import { relationshipCreateSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  return createWorkspaceRecord(request, "knowledge_relationships", relationshipCreateSchema);
}
