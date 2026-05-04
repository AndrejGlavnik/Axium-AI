import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { groupStoredDataset } from "@/lib/analytics/server";
import { findColumn } from "@/lib/analytics/engine";
import type { Json } from "@/types/database";

const groupBySchema = z.object({
  workspace_id: z.string().uuid(),
  file_id: z.string().uuid().optional().nullable(),
  group_by: z.string().min(1),
  metric: z.string().min(1).optional().nullable(),
  operation: z.enum(["count", "sum", "avg"]).default("sum")
});

export async function POST(request: NextRequest) {
  try {
    const body = groupBySchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, body.workspace_id, user.id);

    const loaded = await groupStoredDataset(
      admin,
      body.workspace_id,
      body.file_id ?? null,
      body.group_by,
      body.operation === "count" ? null : (body.metric ?? null),
      body.operation
    );

    const groupColumn = findColumn(loaded.dataset.columns, body.group_by);
    if (!groupColumn) {
      throw new ApiError(400, `Column not found: ${body.group_by}`);
    }

    if (body.operation !== "count" && body.metric && !findColumn(loaded.dataset.columns, body.metric)) {
      throw new ApiError(400, `Metric column not found: ${body.metric}`);
    }

    await admin.from("analysis_runs").insert({
      workspace_id: body.workspace_id,
      user_id: user.id,
      question: `Group ${loaded.file.file_name} by ${body.group_by}`,
      files_used: [{ id: loaded.file.id, file_name: loaded.file.file_name }] as unknown as Json,
      knowledge_used: [] as unknown as Json,
      output_type: "group_by_table",
      file_id: loaded.file.id,
      run_type: "group_by",
      parameters: body as unknown as Json,
      result: loaded.result as unknown as Json,
      created_by: user.id
    });

    return NextResponse.json({
      file: loaded.file,
      result: loaded.result,
      markdown: loaded.markdown
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid group-by request."));
    }
    return apiError(error);
  }
}
