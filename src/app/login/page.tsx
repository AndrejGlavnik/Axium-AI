import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-panel lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-soft">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="font-semibold text-primary">Analytics AI Platform</span>
          </Link>
          <h1 className="text-2xl font-semibold text-primary">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your email to access private analytics workspaces.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
      <section className="hidden border-l border-line bg-white p-12 lg:flex lg:items-center">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Private analytics</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-normal text-primary">
            One analyst interface for documents, datasets and business context.
          </h2>
          <div className="mt-8 grid gap-3">
            {["Workspace-level isolation", "File search for documents", "Server-side analytics over CSV and XLSX"].map(
              (item) => (
                <div key={item} className="rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
