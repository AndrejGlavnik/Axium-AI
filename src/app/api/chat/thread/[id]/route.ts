import { NextResponse, type NextRequest } from "next/server";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }

    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, workspaceId, user.id);

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();

    if (threadError) {
      throw threadError;
    }

    const { data: messages, error: messageError } = await admin
      .from("chat_messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("thread_id", id)
      .order("created_at", { ascending: true });

    if (messageError) {
      throw messageError;
    }

    return NextResponse.json({ thread, messages: messages ?? [] });
  } catch (error) {
    return apiError(error);
  }
}
