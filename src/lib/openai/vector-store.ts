import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient, hasOpenAIConfig } from "@/lib/openai/client";
import type { Workspace } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function ensureWorkspaceVectorStore(admin: AdminClient, workspace: Workspace) {
  if (workspace.openai_vector_store_id) {
    return workspace.openai_vector_store_id;
  }

  if (!hasOpenAIConfig()) {
    return null;
  }

  const openai = getOpenAIClient();
  const vectorStore = await openai.vectorStores.create({
    name: `Workspace ${workspace.name}`,
    metadata: {
      workspace_id: workspace.id
    }
  });

  const { error } = await admin
    .from("workspaces")
    .update({
      openai_vector_store_id: vectorStore.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", workspace.id);

  if (error) {
    throw new Error(error.message);
  }

  return vectorStore.id;
}
