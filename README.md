# Axium AI Analytics Platform

Axium is a production-ready MVP for an AI Analytics Platform as a Service. It lets users sign in, create isolated workspaces, upload analytics files, document business context and ask an AI analyst questions about the selected workspace.

The core product layer is **Axium Knowledge**.

## What Axium Is

Axium is not a Datorama, Databox, GA4, BigQuery or spreadsheet replacement in this MVP. It helps teams understand, document, analyze and review the data they already have across those tools.

Axium answers questions such as:

- What data do we have?
- Where does this metric come from?
- Which dashboard uses this data source?
- What is the source of truth?
- Can these two datasets be joined safely?
- Why do two dashboards show different numbers?
- What changed in this period?

## Axium Knowledge

Axium Knowledge is a workspace-specific analytics memory, data catalog and relationship map. It stores the story behind the data, not only uploaded files.

It includes:

- Knowledge Entries for incidents, issues, metric explanations, tracking changes, business rules and recommendations.
- Data Catalog for dashboards, reports, datasets, files, APIs and source platforms.
- Metric Catalog for definitions, formulas, source fields, grain and aggregation logic.
- Fields Catalog for dimensions, IDs, dates, PII level and join quality.
- Relationship Map for how assets, metrics, fields and entries connect.
- Cross-reference Rules for safe joins, risky joins, warnings and use cases.

The first MVP uses list-based relationship management. A visual mind map graph is intentionally left as a future improvement.

## AI Behavior

The chat API uses server-side OpenAI calls only. Before answering, Axium loads workspace context from:

- uploaded file metadata
- detected file schemas
- knowledge entries
- data assets
- metrics catalog
- fields catalog
- relationships
- cross-reference rules
- recent chat history

The assistant is instructed to use only the current workspace, separate confirmed knowledge from assumptions and avoid inventing formulas, fields, relationships, root causes or source-of-truth rules.

## Features

- Supabase email authentication.
- Protected dashboard routes.
- Workspace creation and active workspace selection.
- Workspace-scoped file uploads to Supabase Storage.
- CSV, XLSX, PDF, DOCX, TXT and JSON upload support.
- Server-side schema detection for CSV, XLSX and JSON.
- Dataset columns, totals and automatic period comparison for structured files.
- Supabase Postgres metadata for files, schemas, chats, analysis runs and Axium Knowledge.
- ChatGPT-style assistant UI with markdown output.
- OpenAI Responses API integration with optional File Search/vector store attachment.
- Basic analytics endpoints for dataset summaries and group-by tables.
- Axium Knowledge CRUD UI with search, filters, detail view and status/confidence badges.
- RLS-enabled Supabase migrations and server-side membership checks.

## Local Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy the environment template:

```bash
cp .env.example .env.local
```

4. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENAI_MODEL` is optional. The server defaults to `gpt-4.1-mini`.

5. Run the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Supabase Setup

1. Create a Supabase project.
2. In Authentication, enable email sign-in. Magic-link sign-in works out of the box.
3. Run migrations in order:

```bash
supabase/migrations/20260503230000_initial_schema.sql
supabase/migrations/20260504010000_axium_knowledge.sql
```

4. Confirm the private storage bucket `workspace-files` exists.
5. Add Supabase URL, anon key and service role key to `.env.local`.

The migrations enable row-level security on tenant-scoped tables. The app also checks the authenticated user and workspace membership inside every API route.

## Optional Seed Examples

After creating a user and workspace, open `supabase/seed_axium_knowledge_examples.sql`, replace the placeholder workspace/user UUIDs and run it in Supabase SQL editor.

It seeds examples such as:

- Ad spend missing for March.
- New GA4 connection added after go-live.
- Negative revenue caused by returns.
- Datorama eCom Retailer Sales Dashboard.
- Buy Now Clicks metric definition.
- ASIN field.
- Amazon sales to product mapping by ASIN cross-reference rule.

## OpenAI Setup

Add `OPENAI_API_KEY` to `.env.local`.

Files are uploaded to Supabase Storage. When OpenAI configuration is present, document files are also uploaded to OpenAI Files and attached to the workspace vector store concept for File Search.

If the key is not configured, files still upload and structured schemas are detected, but OpenAI document search is skipped.

TODO future improvement: add background polling for vector-store indexing status and vector search over Axium Knowledge itself.

## Basic Test Data

Use `sample-data/revenue_sample.csv` to test:

- Upload it on `/dashboard/files`.
- Click `Summarize`.
- Ask chat: `Summarize revenue by region and mention assumptions.`
- Add Axium Knowledge entries on `/dashboard/knowledge`, then ask: `What data do we have and what should I be careful about?`

## API Routes

Workspace:

- `POST /api/workspaces/create`
- `GET /api/workspaces`

Files:

- `POST /api/files/upload`
- `GET /api/files?workspace_id=...`

Chat:

- `POST /api/chat`
- `GET /api/chat/threads?workspace_id=...`
- `GET /api/chat/thread/:id?workspace_id=...`

Analytics:

- `POST /api/analytics/summarize`
- `POST /api/analytics/columns`
- `POST /api/analytics/totals`
- `POST /api/analytics/group-by`
- `POST /api/analytics/compare-periods`

Axium Knowledge:

- `GET /api/knowledge?workspace_id=...`
- `POST /api/knowledge/create`
- `PATCH /api/knowledge/:id`
- `DELETE /api/knowledge/:id`
- `POST /api/knowledge/search`
- `GET /api/knowledge/assets?workspace_id=...`
- `POST /api/knowledge/assets/create`
- `PATCH /api/knowledge/assets/:id`
- `DELETE /api/knowledge/assets/:id`
- `GET /api/knowledge/metrics?workspace_id=...`
- `POST /api/knowledge/metrics/create`
- `PATCH /api/knowledge/metrics/:id`
- `DELETE /api/knowledge/metrics/:id`
- `GET /api/knowledge/fields?workspace_id=...`
- `POST /api/knowledge/fields/create`
- `PATCH /api/knowledge/fields/:id`
- `DELETE /api/knowledge/fields/:id`
- `GET /api/knowledge/relationships?workspace_id=...`
- `POST /api/knowledge/relationships/create`
- `PATCH /api/knowledge/relationships/:id`
- `DELETE /api/knowledge/relationships/:id`
- `GET /api/knowledge/cross-reference-rules?workspace_id=...`
- `POST /api/knowledge/cross-reference-rules/create`
- `PATCH /api/knowledge/cross-reference-rules/:id`
- `DELETE /api/knowledge/cross-reference-rules/:id`

## Security Notes

- OpenAI API key is never exposed to client components.
- Supabase service role key is never exposed to client components.
- Every API route verifies the Supabase user session.
- Every workspace route checks membership in `workspace_members`.
- Every tenant-scoped query filters by `workspace_id`.
- Supabase RLS policies are included as a second line of defense.

## Future Improvements

- Visual Axium Knowledge mind map graph.
- Vector search over Axium Knowledge entries and catalog records.
- Native connectors for GA4, BigQuery, Google Sheets, Datorama and Databox.
- Workspace invitations and role-based editing permissions.
- Background jobs for large uploads and OpenAI indexing.
- Period comparison endpoint with richer date detection.
- Production billing and organization management.
