import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { summarizeStoredDataset } from "@/lib/analytics/server";
import type { Json } from "@/types/database";

const summarizeSchema = z.object({
  workspace_id: z.string().uuid(),
  file_id: z.string().uuid().optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = summarizeSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, body.workspace_id, user.id);

    const result = await summarizeStoredDataset(admin, body.workspace_id, body.file_id);

    await admin.from("analysis_runs").insert({
      workspace_id: body.workspace_id,
      user_id: user.id,
      question: "Summarize dataset",
      files_used: [{ id: result.file.id, file_name: result.file.file_name }] as unknown as Json,
      knowledge_used: [] as unknown as Json,
      output_type: "dataset_summary",
      file_id: result.file.id,
      run_type: "summarize",
      parameters: body as unknown as Json,
      result: result.summary as unknown as Json,
      created_by: user.id
    });

    return NextResponse.json({
      file: result.file,
      summary: result.summary,
      markdown: result.markdown
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid summarize request."));
    }
    return apiError(error);
  }
}
