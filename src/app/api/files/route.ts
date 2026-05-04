import { NextResponse, type NextRequest } from "next/server";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }

    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, workspaceId, user.id);

    const { data, error } = await admin
      .from("files")
      .select(
        "*, file_schemas(id,row_count,columns,detected_columns,detected_date_columns,detected_metric_columns,detected_dimension_columns,sample_rows,created_at,updated_at)"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ files: data ?? [] });
  } catch (error) {
    return apiError(error);
  }
}
