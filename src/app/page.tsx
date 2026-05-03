import Link from "next/link";
import { ArrowRight, BarChart3, FileText, LockKeyhole, MessageSquareText } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Upload business files",
    copy: "Bring in CSV, XLSX, PDF, DOCX, TXT and JSON files for a private workspace knowledge base."
  },
  {
    icon: MessageSquareText,
    title: "Ask an AI analyst",
    copy: "Get answers that cite context, name assumptions and stay inside the selected workspace."
  },
  {
    icon: BarChart3,
    title: "Run basic analytics",
    copy: "Inspect schemas, summarize datasets, calculate totals and group metrics by a dimension."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-primary">Analytics AI Platform</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#001F5F]"
        >
          Sign in
        </Link>
      </nav>

      <section className="border-y border-line bg-gradient-to-b from-white to-[#F4F8FF]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6E8FF] bg-white px-3 py-1 text-sm font-medium text-secondary">
              <LockKeyhole className="h-4 w-4" />
              Private workspace analytics
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-primary md:text-6xl">
              Analytics AI Platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Upload data, ask questions and get grounded business insights from an AI analyst that works only with
              your selected workspace files.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#001F5F]"
              >
                Start analyzing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:border-secondary"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
            <div className="rounded-lg border border-line bg-panel p-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-semibold text-primary">Revenue workspace</span>
                <span className="rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-secondary">Private</span>
              </div>
              <div className="space-y-3 py-5">
                <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-4 py-3 text-sm text-white">
                  What changed in enterprise revenue this quarter?
                </div>
                <div className="max-w-[92%] rounded-lg border border-line bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                  <strong>TLDR:</strong> Enterprise revenue increased while mid-market softness limited total growth.
                  <br />
                  <strong>Evidence:</strong> Used revenue_q4.csv and board_notes.pdf.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Files", "Columns", "Insights"].map((item, index) => (
                  <div key={item} className="rounded-lg border border-line bg-white p-3">
                    <div className="text-xs font-medium text-slate-500">{item}</div>
                    <div className="mt-2 text-xl font-semibold text-primary">{[6, 42, 11][index]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-14 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <feature.icon className="h-6 w-6 text-secondary" />
            <h2 className="mt-4 text-lg font-semibold text-primary">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{feature.copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
