import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { calculateStoredTotals } from "@/lib/analytics/server";
import type { Json } from "@/types/database";

const totalsSchema = z.object({
  workspace_id: z.string().uuid(),
  file_id: z.string().uuid().optional().nullable(),
  metrics: z.array(z.string().min(1)).optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = totalsSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceWriter(admin, body.workspace_id, user.id);

    const result = await calculateStoredTotals(admin, body.workspace_id, body.file_id ?? null, body.metrics ?? null);

    await admin.from("analysis_runs").insert({
      workspace_id: body.workspace_id,
      user_id: user.id,
      question: "Calculate dataset totals",
      files_used: [{ id: result.file.id, file_name: result.file.file_name }] as unknown as Json,
      knowledge_used: [] as unknown as Json,
      output_type: "totals_table",
      file_id: result.file.id,
      run_type: "totals",
      parameters: body as unknown as Json,
      result: result.result as unknown as Json,
      created_by: user.id
    });

    return NextResponse.json({
      file: result.file,
      result: result.result,
      markdown: result.markdown
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid totals request."));
    }
    return apiError(error);
  }
}
