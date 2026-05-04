export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-secondary">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-primary">Platform configuration</h1>
        <p className="mt-2 text-sm text-slate-600">Runtime configuration is loaded from server environment variables.</p>
      </div>

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Required environment variables</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "OPENAI_API_KEY",
            "CONNECTION_ENCRYPTION_KEY",
            "NEXT_PUBLIC_APP_URL"
          ].map((item) => (
            <div key={item} className="rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Security boundaries</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <p>OpenAI and Supabase service-role keys are used only in server API routes.</p>
          <p>Every route verifies the user session and workspace membership before reading workspace data.</p>
          <p>Database migrations include row-level security policies for direct client access hardening.</p>
        </div>
      </section>
    </div>
  );
}
