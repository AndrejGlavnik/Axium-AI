import { type NextRequest } from "next/server";
import { deleteConnectionResource, updateConnectionResource } from "@/lib/connections/api";

type RouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateConnectionResource(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return deleteConnectionResource(request, context);
}
