import { type NextRequest } from "next/server";
import { deleteWorkspaceRecord, updateWorkspaceRecord } from "@/lib/knowledge/api";
import { crossReferenceRuleUpdateSchema } from "@/lib/knowledge/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateWorkspaceRecord(request, context, "cross_reference_rules", crossReferenceRuleUpdateSchema);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteWorkspaceRecord(request, context, "cross_reference_rules");
}
