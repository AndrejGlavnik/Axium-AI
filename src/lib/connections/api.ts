import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertWorkspaceMember, assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { encryptConnectionSecret } from "@/lib/connections/secrets";
import { connectionCreateSchema, connectionUpdateSchema } from "@/lib/connections/schemas";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function listConnections(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }

    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, workspaceId, user.id);

    const { data, error } = await admin
      .from("connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ connections: data ?? [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function createConnection(request: NextRequest) {
  try {
    const body = connectionCreateSchema.parse(await request.json());
    const { credential_value: credentialValue, credential_label: credentialLabel, ...record } = body;
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceWriter(admin, body.workspace_id, user.id);

    const hasCredential = Boolean(credentialValue?.trim());
    const encryptedCredential = hasCredential ? encryptConnectionSecret(credentialValue ?? "", credentialLabel) : null;
    const { data: connection, error } = await admin
      .from("connections")
      .insert({
        ...record,
        created_by: user.id,
        has_credentials: hasCredential,
        status: hasCredential ? "connected" : record.status
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (encryptedCredential) {
      await saveCredential(admin, connection.id, body.workspace_id, user.id, credentialLabel, encryptedCredential);
    }

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid connection request."));
    }
    return apiError(error);
  }
}

export async function updateConnection(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = connectionUpdateSchema.parse(await request.json());
    const { credential_value: credentialValue, credential_label: credentialLabel, ...record } = body;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findConnection(admin, id);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const updatePayload = { ...record } as Record<string, unknown>;
    const encryptedCredential = credentialValue?.trim() ? encryptConnectionSecret(credentialValue, credentialLabel) : null;
    if (credentialValue?.trim()) {
      updatePayload.has_credentials = true;
      updatePayload.status = "connected";
    }

    const { data: connection, error } = await admin
      .from("connections")
      .update(updatePayload as never)
      .eq("id", id)
      .eq("workspace_id", existing.workspace_id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (encryptedCredential) {
      await saveCredential(admin, id, existing.workspace_id, user.id, credentialLabel, encryptedCredential);
    }

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid connection request."));
    }
    return apiError(error);
  }
}

export async function deleteConnection(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findConnection(admin, id);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const { error } = await admin.from("connections").delete().eq("id", id).eq("workspace_id", existing.workspace_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function testConnection(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findConnection(admin, id);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const nextStatus = existing.auth_type === "none" || existing.has_credentials ? "connected" : "needs_credentials";
    const notes =
      nextStatus === "connected"
        ? "Connection metadata is complete enough for Axium Knowledge. Provider sync is a future integration step."
        : "Credentials are required before this connection can be used for native sync.";

    const { data, error } = await admin
      .from("connections")
      .update({
        status: nextStatus,
        last_tested_at: new Date().toISOString(),
        notes
      })
      .eq("id", id)
      .eq("workspace_id", existing.workspace_id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ connection: data, notes });
  } catch (error) {
    return apiError(error);
  }
}

async function findConnection(admin: AdminClient, id: string) {
  const { data, error } = await admin.from("connections").select("*").eq("id", id).single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new ApiError(404, "Connection not found.");
  }

  return data;
}

async function saveCredential(
  admin: AdminClient,
  connectionId: string,
  workspaceId: string,
  userId: string,
  label: string | null | undefined,
  encrypted: ReturnType<typeof encryptConnectionSecret>
) {
  const { error } = await admin.from("connection_secrets").insert({
    workspace_id: workspaceId,
    connection_id: connectionId,
    created_by: userId,
    secret_label: label || "Connection credential",
    encrypted_payload: encrypted.encrypted_payload,
    secret_iv: encrypted.secret_iv,
    secret_tag: encrypted.secret_tag,
    secret_hint: encrypted.secret_hint,
    metadata: {} as Json
  });

  if (error) {
    throw error;
  }
}
