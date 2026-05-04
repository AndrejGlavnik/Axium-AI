import { type NextRequest } from "next/server";
import { createWorkspaceRecord } from "@/lib/knowledge/api";
import { metricCreateSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  return createWorkspaceRecord(request, "metrics_catalog", metricCreateSchema);
}
