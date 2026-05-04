import { type NextRequest } from "next/server";
import { createWorkspaceRecord } from "@/lib/knowledge/api";
import { knowledgeEntryCreateSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  return createWorkspaceRecord(request, "knowledge_entries", knowledgeEntryCreateSchema);
}
