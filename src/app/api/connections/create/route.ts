import { type NextRequest } from "next/server";
import { createConnection } from "@/lib/connections/api";

export async function POST(request: NextRequest) {
  return createConnection(request);
}
