# Analytics AI Platform

Production-ready MVP for a private AI analytics platform built with Next.js App Router, TypeScript, Tailwind CSS, Supabase and the OpenAI Node SDK.

## What It Does

- Email sign-in with Supabase Auth.
- Protected dashboard routes.
- Workspace creation and active workspace selection.
- Workspace-scoped file uploads to Supabase Storage.
- File metadata, schemas, chat threads, messages and analysis runs stored in Supabase Postgres.
- OpenAI file upload and vector-store attachment for document Q&A.
- Chat endpoint using the OpenAI Responses API with file search.
- Server-side parsing for CSV, XLSX and JSON datasets.
- Basic analytics endpoints for dataset summaries and group-by tables.

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
3. Run the migration in `supabase/migrations/20260503230000_initial_schema.sql`.
4. Confirm the private storage bucket `workspace-files` exists.
5. Add the Supabase URL, anon key and service role key to `.env.local`.

The migration enables row-level security on tenant-scoped tables. The app also performs server-side membership checks in every API route.

## OpenAI Setup

Add `OPENAI_API_KEY` to `.env.local`. File uploads are sent to the OpenAI Files API and attached to the workspace vector store. Chat uses the Responses API with the `file_search` tool when a workspace has an indexed vector store.

If the key is not configured, files still upload to Supabase and structured schemas are detected, but OpenAI document search is skipped.

## Basic Test Data

Use `sample-data/revenue_sample.csv` to test:

- Upload it on `/dashboard/files`.
- Click `Summarize`.
- Ask the chat: `Summarize revenue by region and mention assumptions.`

## API Routes

- `POST /api/workspaces/create`
- `GET /api/workspaces`
- `POST /api/files/upload`
- `GET /api/files?workspace_id=...`
- `POST /api/chat`
- `GET /api/chat/threads?workspace_id=...`
- `GET /api/chat/thread/:id?workspace_id=...`
- `POST /api/analytics/summarize`
- `POST /api/analytics/group-by`

## Security Notes

- OpenAI and Supabase service-role keys are never used in client components.
- API routes verify the Supabase session before doing work.
- All workspace data access checks membership in `workspace_members`.
- All database queries in API routes are filtered by `workspace_id`.
- RLS policies are included as a second line of defense.

## Production Checklist

- Configure custom email templates and redirect URLs in Supabase Auth.
- Set production environment variables in your host.
- Review upload size limits and allowed MIME types.
- Add background jobs if you want polling for OpenAI vector-store indexing status.
- Add organization invites and billing before a commercial launch.
