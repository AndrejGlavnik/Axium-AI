import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { compareStoredPeriods } from "@/lib/analytics/server";
import type { Json } from "@/types/database";

const comparePeriodsSchema = z.object({
  workspace_id: z.string().uuid(),
  file_id: z.string().uuid().optional().nullable(),
  date_column: z.string().min(1).optional().nullable(),
  metric: z.string().min(1).optional().nullable(),
  current_start: z.string().min(1).optional().nullable(),
  current_end: z.string().min(1).optional().nullable(),
  previous_start: z.string().min(1).optional().nullable(),
  previous_end: z.string().min(1).optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = comparePeriodsSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceWriter(admin, body.workspace_id, user.id);

    const result = await compareStoredPeriods(admin, body.workspace_id, body.file_id ?? null, {
      dateColumn: body.date_column ?? null,
      metric: body.metric ?? null,
      currentStart: body.current_start ?? null,
      currentEnd: body.current_end ?? null,
      previousStart: body.previous_start ?? null,
      previousEnd: body.previous_end ?? null
    });

    await admin.from("analysis_runs").insert({
      workspace_id: body.workspace_id,
      user_id: user.id,
      question: "Compare dataset periods",
      files_used: [{ id: result.file.id, file_name: result.file.file_name }] as unknown as Json,
      knowledge_used: [] as unknown as Json,
      output_type: "period_comparison",
      file_id: result.file.id,
      run_type: "compare_periods",
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
      return apiError(new ApiError(400, "Invalid compare-periods request."));
    }
    return apiError(error);
  }
}
