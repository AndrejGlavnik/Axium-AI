import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export async function POST(request: NextRequest) {
  try {
    const { admin, user } = await requireAuthenticatedUser();
    const body = createWorkspaceSchema.parse(await request.json());

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({
        name: body.name,
        owner_id: user.id
      })
      .select("*")
      .single();

    if (workspaceError) {
      throw workspaceError;
    }

    const { error: memberError } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner"
    });

    if (memberError) {
      throw memberError;
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "Workspace name must be between 2 and 80 characters."));
    }
    return apiError(error);
  }
}
