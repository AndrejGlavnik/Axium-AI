import { type NextRequest } from "next/server";
import { deleteConnection, updateConnection } from "@/lib/connections/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateConnection(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteConnection(request, context);
}
