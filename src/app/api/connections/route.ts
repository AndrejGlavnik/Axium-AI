import { type NextRequest } from "next/server";
import { listConnections } from "@/lib/connections/api";

export async function GET(request: NextRequest) {
  return listConnections(request);
}
