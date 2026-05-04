import { NextResponse, type NextRequest } from "next/server";
import { toFile } from "openai/uploads";
import { ACCEPTED_FILE_EXTENSIONS, MAX_UPLOAD_BYTES, STORAGE_BUCKET } from "@/lib/constants";
import { assertWorkspaceWriter, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { ensureWorkspaceVectorStore } from "@/lib/openai/vector-store";
import { getOpenAIClient, hasOpenAIConfig } from "@/lib/openai/client";
import { getFileExtension, isStructuredFile, parseDataset } from "@/lib/analytics/parser";
import type { Json } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const { admin, user } = await requireAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const workspaceId = formData.get("workspace_id");

    if (!(file instanceof File)) {
      throw new ApiError(400, "A file is required.");
    }
    if (typeof workspaceId !== "string" || !workspaceId) {
      throw new ApiError(400, "workspace_id is required.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(400, "File is too large. Maximum size is 25 MB.");
    }

    const extension = getFileExtension(file.name);
    if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
      throw new ApiError(400, "Unsupported file type.");
    }

    await assertWorkspaceWriter(admin, workspaceId, user.id);

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      throw workspaceError;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${workspaceId}/${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) {
      throw uploadError;
    }

    let openaiFileId: string | null = null;
    let vectorStoreId: string | null = null;
    let status: "stored" | "indexing" | "ready" | "failed" | "openai_skipped" = hasOpenAIConfig() ? "stored" : "openai_skipped";

    if (hasOpenAIConfig()) {
      const openai = getOpenAIClient();
      vectorStoreId = await ensureWorkspaceVectorStore(admin, workspace);
      if (vectorStoreId) {
        const uploadedOpenAIFile = await openai.files.create({
          file: await toFile(buffer, file.name, { type: file.type || "application/octet-stream" }),
          purpose: "assistants"
        });
        openaiFileId = uploadedOpenAIFile.id;

        const vectorStoreFile = await openai.vectorStores.files.create(vectorStoreId, {
          file_id: openaiFileId,
          attributes: {
            workspace_id: workspaceId,
            uploaded_by: user.id,
            original_name: file.name
          }
        });
        status = vectorStoreFile.status === "completed" ? "ready" : "indexing";
      }
    }

    const { data: savedFile, error: fileError } = await admin
      .from("files")
      .insert({
        workspace_id: workspaceId,
        uploaded_by: user.id,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: storagePath,
        openai_file_id: openaiFileId,
        vector_store_id: vectorStoreId,
        status
      })
      .select("*")
      .single();

    if (fileError) {
      throw fileError;
    }

    if (isStructuredFile(file.name, file.type)) {
      const parsed = await parseDataset(buffer, file.name);
      const detectedColumns = parsed.columns.map((column) => column.name);
      const detectedDateColumns = parsed.columns.filter((column) => column.type === "date").map((column) => column.name);
      const detectedMetricColumns = parsed.columns.filter((column) => column.type === "number").map((column) => column.name);
      const detectedDimensionColumns = parsed.columns
        .filter((column) => column.type !== "number" && column.type !== "empty")
        .map((column) => column.name);

      const { error: schemaError } = await admin.from("file_schemas").insert({
        file_id: savedFile.id,
        workspace_id: workspaceId,
        columns: parsed.columns as unknown as Json,
        detected_columns: detectedColumns,
        detected_date_columns: detectedDateColumns,
        detected_metric_columns: detectedMetricColumns,
        detected_dimension_columns: detectedDimensionColumns,
        row_count: parsed.rowCount,
        sample_rows: parsed.sampleRows as unknown as Json
      });

      if (schemaError) {
        throw schemaError;
      }
    }

    return NextResponse.json({ file: savedFile }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
