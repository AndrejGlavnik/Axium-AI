import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { listStoredDatasetColumns } from "@/lib/analytics/server";

const columnsSchema = z.object({
  workspace_id: z.string().uuid(),
  file_id: z.string().uuid().optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = columnsSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceWriter(admin, body.workspace_id, user.id);

    const result = await listStoredDatasetColumns(admin, body.workspace_id, body.file_id);

    return NextResponse.json({
      file: result.file,
      columns: result.columns,
      markdown: result.markdown
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Invalid columns request."));
    }
    return apiError(error);
  }
}
