import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AuthenticatedContext = {
  user: User;
  supabase: ServerClient;
  admin: AdminClient;
};

export async function requireAuthenticatedUser(): Promise<AuthenticatedContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError(401, "You must be signed in.");
  }

  return {
    user,
    supabase,
    admin: createSupabaseAdminClient()
  };
}

export async function assertWorkspaceMember(admin: AdminClient, workspaceId: string, userId: string) {
  const { data, error } = await admin
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, error.message);
  }

  if (!data) {
    throw new ApiError(403, "You do not have access to this workspace.");
  }

  return data;
}

export async function assertWorkspaceWriter(admin: AdminClient, workspaceId: string, userId: string) {
  const membership = await assertWorkspaceMember(admin, workspaceId, userId);
  if (!["owner", "admin", "analyst"].includes(membership.role)) {
    throw new ApiError(403, "You have read-only access to this workspace.");
  }

  return membership;
}
