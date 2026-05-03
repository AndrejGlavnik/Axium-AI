import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import type { Workspace, WorkspaceRole } from "@/types/database";

export async function GET() {
  try {
    const { admin, user } = await requireAuthenticatedUser();

    const { data, error } = await admin
      .from("workspace_members")
      .select("role, workspaces(id,name,owner_id,openai_vector_store_id,created_at,updated_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const memberships = (data ?? []) as unknown as Array<{
      role: WorkspaceRole;
      workspaces: Workspace | null;
    }>;

    const workspaces = memberships
      .filter((membership) => membership.workspaces)
      .map((membership) => ({
        role: membership.role,
        ...membership.workspaces
      }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    return apiError(error);
  }
}
