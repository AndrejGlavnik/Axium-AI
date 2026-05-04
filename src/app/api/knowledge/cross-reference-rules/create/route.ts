import { type NextRequest } from "next/server";
import { createWorkspaceRecord } from "@/lib/knowledge/api";
import { crossReferenceRuleCreateSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  return createWorkspaceRecord(request, "cross_reference_rules", crossReferenceRuleCreateSchema);
}
