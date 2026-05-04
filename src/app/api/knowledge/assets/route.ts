import { type NextRequest } from "next/server";
import { listWorkspaceRecords } from "@/lib/knowledge/api";

export async function GET(request: NextRequest) {
  return listWorkspaceRecords(request, "data_assets");
}
