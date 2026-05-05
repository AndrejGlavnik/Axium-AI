import { type NextRequest } from "next/server";
import { discoverConnection } from "@/lib/connections/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return discoverConnection(request, context);
}
