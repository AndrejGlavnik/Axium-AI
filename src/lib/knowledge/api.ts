import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { assertWorkspaceMember, assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type KnowledgeTableName =
  | "knowledge_entries"
  | "data_assets"
  | "metrics_catalog"
  | "fields_catalog"
  | "knowledge_relationships"
  | "cross_reference_rules";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const responseKeys: Record<KnowledgeTableName, string> = {
  knowledge_entries: "entries",
  data_assets: "assets",
  metrics_catalog: "metrics",
  fields_catalog: "fields",
  knowledge_relationships: "relationships",
  cross_reference_rules: "rules"
};

const listOrders: Record<KnowledgeTableName, string> = {
  knowledge_entries: "updated_at",
  data_assets: "updated_at",
  metrics_catalog: "updated_at",
  fields_catalog: "updated_at",
  knowledge_relationships: "updated_at",
  cross_reference_rules: "updated_at"
};

export async function listWorkspaceRecords(request: NextRequest, tableName: KnowledgeTableName) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }

    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, workspaceId, user.id);

    const { data, error } = await admin
      .from(tableName)
      .select("*")
      .eq("workspace_id", workspaceId)
      .order(listOrders[tableName], { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ [responseKeys[tableName]]: data ?? [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function createWorkspaceRecord<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  tableName: KnowledgeTableName,
  schema: TSchema
) {
  try {
    const body = schema.parse(await request.json()) as z.infer<TSchema> & { workspace_id: string };
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceWriter(admin, body.workspace_id, user.id);

    const record = {
      ...body,
      created_by: user.id
    };

    const { data, error } = await admin.from(tableName).insert(record as never).select("*").single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError(new ApiError(400, "Invalid Axium Knowledge request."));
    }
    return apiError(error);
  }
}

export async function updateWorkspaceRecord<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  context: RouteContext,
  tableName: KnowledgeTableName,
  schema: TSchema
) {
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json()) as Record<string, unknown>;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findScopedRecord(admin, tableName, id);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const { data, error } = await admin
      .from(tableName)
      .update(body as never)
      .eq("id", id)
      .eq("workspace_id", existing.workspace_id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError(new ApiError(400, "Invalid Axium Knowledge update."));
    }
    return apiError(error);
  }
}

export async function deleteWorkspaceRecord(request: NextRequest, context: RouteContext, tableName: KnowledgeTableName) {
  try {
    const { id } = await context.params;
    const { admin, user } = await requireAuthenticatedUser();
    const existing = await findScopedRecord(admin, tableName, id);
    await assertWorkspaceWriter(admin, existing.workspace_id, user.id);

    const { error } = await admin.from(tableName).delete().eq("id", id).eq("workspace_id", existing.workspace_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

async function findScopedRecord(admin: AdminClient, tableName: KnowledgeTableName, id: string) {
  const { data, error } = await admin.from(tableName).select("id, workspace_id").eq("id", id).single();

  if (error) {
    throw error;
  }

  if (!data?.workspace_id) {
    throw new ApiError(404, "Axium Knowledge item not found.");
  }

  return data as { id: string; workspace_id: string };
}
