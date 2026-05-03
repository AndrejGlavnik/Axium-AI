import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ANALYST_SYSTEM_INSTRUCTION } from "@/lib/constants";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { buildAnalyticsContext } from "@/lib/analytics/chat-context";
import { getAnalystModel, getOpenAIClient } from "@/lib/openai/client";
import { extractFileSearchSources, extractResponseText } from "@/lib/openai/responses";

const chatSchema = z.object({
  workspace_id: z.string().uuid(),
  thread_id: z.string().uuid().optional().nullable(),
  message: z.string().trim().min(1).max(12000)
});

export async function POST(request: NextRequest) {
  try {
    const body = chatSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, body.workspace_id, user.id);

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", body.workspace_id)
      .single();

    if (workspaceError) {
      throw workspaceError;
    }

    let threadId = body.thread_id ?? null;
    if (!threadId) {
      const title = body.message.slice(0, 72);
      const { data: thread, error } = await admin
        .from("chat_threads")
        .insert({
          workspace_id: body.workspace_id,
          created_by: user.id,
          title
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }
      threadId = thread.id;
    }

    const { error: userMessageError } = await admin.from("chat_messages").insert({
      workspace_id: body.workspace_id,
      thread_id: threadId,
      role: "user",
      content: body.message
    });

    if (userMessageError) {
      throw userMessageError;
    }

    const { data: history, error: historyError } = await admin
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("workspace_id", body.workspace_id)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(16);

    if (historyError) {
      throw historyError;
    }

    const analyticsContext = await buildAnalyticsContext(admin, body.workspace_id, body.message);
    const input = buildPrompt({
      workspaceName: workspace.name,
      analyticsContext,
      history: history ?? [],
      question: body.message
    });

    const openai = getOpenAIClient();
    const tools = workspace.openai_vector_store_id
      ? [
          {
            type: "file_search" as const,
            vector_store_ids: [workspace.openai_vector_store_id],
            max_num_results: 6
          }
        ]
      : undefined;

    const response = await openai.responses.create({
      model: getAnalystModel(),
      instructions: ANALYST_SYSTEM_INSTRUCTION,
      input,
      tools,
      include: ["file_search_call.results"]
    });

    const answer = extractResponseText(response) || "I could not produce an answer from the available workspace context.";
    const sources = extractFileSearchSources(response);

    const { data: assistantMessage, error: assistantError } = await admin
      .from("chat_messages")
      .insert({
        workspace_id: body.workspace_id,
        thread_id: threadId,
        role: "assistant",
        content: appendSources(answer, sources),
        sources
      })
      .select("*")
      .single();

    if (assistantError) {
      throw assistantError;
    }

    await admin
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("workspace_id", body.workspace_id)
      .eq("id", threadId);

    return NextResponse.json({
      thread_id: threadId,
      message: assistantMessage
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid chat request."));
    }
    return apiError(error);
  }
}

function buildPrompt({
  workspaceName,
  analyticsContext,
  history,
  question
}: {
  workspaceName: string;
  analyticsContext: string;
  history: Array<{ role: string; content: string }>;
  question: string;
}) {
  const transcript = history
    .slice(-12)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return [
    `Workspace: ${workspaceName}`,
    "Use only the current workspace context below.",
    "Structured analytics context:",
    analyticsContext,
    "Recent conversation:",
    transcript || "(No previous messages.)",
    "Current user question:",
    question
  ].join("\n\n");
}

function appendSources(answer: string, sources: Array<{ file_name?: string; file_id?: string }>) {
  if (!sources.length || /sources used/i.test(answer)) {
    return answer;
  }

  const lines = sources.map((source) => `- ${source.file_name || source.file_id || "Workspace file"}`);
  return `${answer}\n\n## Sources used\n${lines.join("\n")}`;
}
