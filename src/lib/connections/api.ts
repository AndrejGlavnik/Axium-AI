import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertWorkspaceMember, assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { testHttpConnection } from "@/lib/connections/safe-fetch";
import { decryptConnectionSecret, encryptConnectionSecret } from "@/lib/connections/secrets";
import {
  connectionCreateSchema,
  connectionResourceCreateSchema,
  connectionResourceUpdateSchema,
  connectionUpdateSchema
} from "@/lib/connections/schemas";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type RouteContext = {
  params: Promise<{ id: string }>;
};
type ResourceRouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
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

export async function listConnectionResources(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }

    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, workspaceId, user.id);

    const { data, error } = await admin
      .from("connection_resources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("connection_id", id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ resources: data ?? [] });
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

export async function createConnectionResource(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = connectionResourceCreateSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    const connection = await findConnection(admin, id);
    if (body.workspace_id !== connection.workspace_id) {
      throw new ApiError(403, "Connection does not belong to this workspace.");
    }
    await assertWorkspaceWriter(admin, connection.workspace_id, user.id);
    await assertLinkedAsset(admin, connection.workspace_id, body.linked_asset_id);

    const record = omitWorkspaceId(body);
    const { data, error } = await admin
      .from("connection_resources")
      .insert({
        ...record,
        workspace_id: connection.workspace_id,
        connection_id: connection.id,
        created_by: user.id,
        discovered_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ resource: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid connection resource request."));
    }
    return apiError(error);
  }
}

export async function updateConnectionResource(request: NextRequest, context: ResourceRouteContext) {
  try {
    const { id, resourceId } = await context.params;
    const body = connectionResourceUpdateSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findConnectionResource(admin, id, resourceId);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);
    if (body.workspace_id && body.workspace_id !== existing.workspace_id) {
      throw new ApiError(403, "Connection resource does not belong to this workspace.");
    }
    await assertLinkedAsset(admin, existing.workspace_id, body.linked_asset_id);

    const record = omitWorkspaceId(body);
    const { data, error } = await admin
      .from("connection_resources")
      .update(record as never)
      .eq("id", resourceId)
      .eq("connection_id", id)
      .eq("workspace_id", existing.workspace_id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ resource: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid connection resource request."));
    }
    return apiError(error);
  }
}

export async function deleteConnectionResource(_request: NextRequest, context: ResourceRouteContext) {
  try {
    const { id, resourceId } = await context.params;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findConnectionResource(admin, id, resourceId);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const { error } = await admin
      .from("connection_resources")
      .delete()
      .eq("id", resourceId)
      .eq("connection_id", id)
      .eq("workspace_id", existing.workspace_id);

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

    const secret = existing.has_credentials ? await getLatestSecret(admin, existing.id) : null;
    const liveResult = await testHttpConnection(existing, secret);
    const nextStatus = liveResult.ok ? "connected" : existing.has_credentials || existing.auth_type === "none" ? "error" : "needs_credentials";
    const notes = liveResult.notes;

    const { data, error } = await admin
      .from("connections")
      .update({
        status: nextStatus,
        last_tested_at: new Date().toISOString(),
        notes: `${notes}${liveResult.status ? ` HTTP ${liveResult.status} ${liveResult.statusText}.` : ""}`
      })
      .eq("id", id)
      .eq("workspace_id", existing.workspace_id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ connection: data, test: liveResult, notes });
  } catch (error) {
    return apiError(error);
  }
}

export async function discoverConnection(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { admin, user } = await requireAuthenticatedUser();
    const connection = await findConnection(admin, id);
    await assertWorkspaceWriter(admin, connection.workspace_id, user.id);

    const resources = await buildConnectionResources(admin, connection, user.id);

    if (resources.length) {
      const { error } = await admin.from("connection_resources").upsert(resources as never, {
        onConflict: "workspace_id,connection_id,resource_name,resource_type"
      });

      if (error) {
        throw error;
      }
    }

    const { data, error } = await admin
      .from("connection_resources")
      .select("*")
      .eq("workspace_id", connection.workspace_id)
      .eq("connection_id", connection.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      resources: data ?? [],
      notes: resources.length
        ? "Axium created connection resources from the documented connection metadata and linked assets."
        : "No resources could be inferred yet. Add linked assets, an account identifier or a base URL."
    });
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

async function findConnectionResource(admin: AdminClient, connectionId: string, resourceId: string) {
  const { data, error } = await admin
    .from("connection_resources")
    .select("*")
    .eq("id", resourceId)
    .eq("connection_id", connectionId)
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new ApiError(404, "Connection resource not found.");
  }

  return data;
}

async function assertLinkedAsset(admin: AdminClient, workspaceId: string, assetId: string | null | undefined) {
  if (!assetId) {
    return;
  }

  const { data, error } = await admin
    .from("data_assets")
    .select("id")
    .eq("id", assetId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new ApiError(400, "Linked asset must belong to the same workspace.");
  }
}

function omitWorkspaceId<T extends { workspace_id?: unknown }>(value: T) {
  const copy = { ...value };
  delete copy.workspace_id;
  return copy;
}

async function getLatestSecret(admin: AdminClient, connectionId: string) {
  const { data, error } = await admin
    .from("connection_secrets")
    .select("encrypted_payload,secret_iv,secret_tag,secret_hint")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? decryptConnectionSecret(data) : null;
}

async function buildConnectionResources(admin: AdminClient, connection: Awaited<ReturnType<typeof findConnection>>, userId: string) {
  const now = new Date().toISOString();
  const resources: Array<Record<string, unknown>> = [];

  if (connection.base_url) {
    const parsed = tryParseUrl(connection.base_url);
    resources.push({
      workspace_id: connection.workspace_id,
      connection_id: connection.id,
      created_by: userId,
      resource_name: parsed ? `${connection.provider} endpoint ${parsed.pathname || "/"}` : `${connection.provider} endpoint`,
      resource_type: "api_endpoint",
      external_id: parsed?.hostname ?? null,
      path: connection.base_url,
      description: `Documented endpoint for ${connection.name}.`,
      schema_summary: {
        provider: connection.provider,
        auth_type: connection.auth_type,
        sync_frequency: connection.sync_frequency
      } as Json,
      status: "active",
      discovered_at: now
    });
  }

  if (connection.account_identifier) {
    resources.push({
      workspace_id: connection.workspace_id,
      connection_id: connection.id,
      created_by: userId,
      resource_name: `${connection.provider} ${connection.account_identifier}`,
      resource_type: providerResourceType(connection.provider),
      external_id: connection.account_identifier,
      path: connection.documentation_url,
      description: `Documented ${connection.provider} account, property, dashboard or dataset identifier.`,
      schema_summary: { provider: connection.provider } as Json,
      status: "active",
      discovered_at: now
    });
  }

  if (connection.linked_asset_ids.length) {
    const { data: assets, error } = await admin
      .from("data_assets")
      .select("id,asset_name,asset_type,source_platform,description,status")
      .eq("workspace_id", connection.workspace_id)
      .in("id", connection.linked_asset_ids);

    if (error) {
      throw error;
    }

    for (const asset of assets ?? []) {
      resources.push({
        workspace_id: connection.workspace_id,
        connection_id: connection.id,
        created_by: userId,
        resource_name: asset.asset_name,
        resource_type: "linked_asset",
        external_id: asset.id,
        path: null,
        description: asset.description ?? `Linked Axium Knowledge asset from ${connection.name}.`,
        schema_summary: {
          asset_type: asset.asset_type,
          source_platform: asset.source_platform,
          asset_status: asset.status
        } as Json,
        status: "active",
        linked_asset_id: asset.id,
        discovered_at: now
      });
    }
  }

  return resources;
}

function providerResourceType(provider: string) {
  if (provider === "GA4") {
    return "property";
  }
  if (provider === "BigQuery") {
    return "dataset";
  }
  if (provider === "Google Sheets") {
    return "sheet";
  }
  if (provider === "Datorama" || provider === "Databox") {
    return "dashboard";
  }
  return "account";
}

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
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
