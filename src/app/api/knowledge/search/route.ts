import { NextResponse, type NextRequest } from "next/server";
import { assertWorkspaceMember, requireAuthenticatedUser } from "@/lib/api/auth";
import { apiError, ApiError } from "@/lib/api/errors";
import { searchKnowledgeSchema } from "@/lib/knowledge/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = searchKnowledgeSchema.parse(await request.json());
    const { admin, user } = await requireAuthenticatedUser();
    await assertWorkspaceMember(admin, body.workspace_id, user.id);

    const pattern = `%${body.query}%`;
    const [entries, assets, metrics, fields, relationships, rules] = await Promise.all([
      admin
        .from("knowledge_entries")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(
          `title.ilike.${pattern},description.ilike.${pattern},affected_system.ilike.${pattern},affected_dashboard.ilike.${pattern},affected_metric.ilike.${pattern}`
        )
        .limit(20),
      admin
        .from("data_assets")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(`asset_name.ilike.${pattern},description.ilike.${pattern},source_platform.ilike.${pattern}`)
        .limit(20),
      admin
        .from("metrics_catalog")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(`metric_name.ilike.${pattern},business_definition.ilike.${pattern},technical_definition.ilike.${pattern},formula.ilike.${pattern}`)
        .limit(20),
      admin
        .from("fields_catalog")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(`field_name.ilike.${pattern},description.ilike.${pattern},known_issues.ilike.${pattern}`)
        .limit(20),
      admin
        .from("knowledge_relationships")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(`relationship_type.ilike.${pattern},description.ilike.${pattern}`)
        .limit(20),
      admin
        .from("cross_reference_rules")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .or(`rule_name.ilike.${pattern},join_field_primary.ilike.${pattern},join_field_secondary.ilike.${pattern},use_case.ilike.${pattern},warning.ilike.${pattern}`)
        .limit(20)
    ]);

    const error = [entries.error, assets.error, metrics.error, fields.error, relationships.error, rules.error].find(Boolean);
    if (error) {
      throw error;
    }

    return NextResponse.json({
      entries: entries.data ?? [],
      assets: assets.data ?? [],
      metrics: metrics.data ?? [],
      fields: fields.data ?? [],
      relationships: relationships.data ?? [],
      rules: rules.data ?? []
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError(new ApiError(400, "Search query is required."));
    }
    return apiError(error);
  }
}
