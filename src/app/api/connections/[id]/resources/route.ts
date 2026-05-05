import { type NextRequest } from "next/server";
import { listConnectionResources } from "@/lib/connections/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return listConnectionResources(request, context);
}
