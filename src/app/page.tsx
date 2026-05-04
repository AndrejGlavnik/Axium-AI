import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenText, FileText, LockKeyhole, MessageSquareText } from "lucide-react";

const features = [
  {
    icon: BookOpenText,
    title: "Map Axium Knowledge",
    copy: "Document data assets, metric definitions, fields, dashboard logic, known issues and safe cross-references."
  },
  {
    icon: FileText,
    title: "Upload business files",
    copy: "Bring in CSV, XLSX, PDF, DOCX, TXT and JSON files for private workspace context."
  },
  {
    icon: MessageSquareText,
    title: "Ask Axium",
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
          <span className="text-lg font-semibold text-primary">Axium AI Analytics Platform</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#001F5F]"
        >
          Sign in
        </Link>
      </nav>

      <section className="relative overflow-hidden border-y border-line bg-white">
        <div className="absolute inset-x-0 bottom-0 top-24 hidden lg:block" aria-hidden="true">
          <div className="mx-auto h-full max-w-7xl px-6">
            <div className="ml-auto h-full max-w-5xl rounded-t-2xl border border-line bg-panel p-4 shadow-soft">
              <div className="grid h-full grid-cols-[14rem_1fr] overflow-hidden rounded-xl border border-line bg-white">
                <div className="border-r border-line bg-primary p-4 text-white">
                  <div className="text-sm font-semibold">Axium</div>
                  <div className="mt-8 space-y-3 text-xs text-[#D6E8FF]">
                    <div>Dashboard</div>
                    <div>Files</div>
                    <div>Chat</div>
                    <div>Axium Knowledge</div>
                    <div>Settings</div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_19rem] gap-4 p-5">
                  <div className="space-y-4">
                    <div className="h-16 rounded-lg border border-line bg-[#F8FBFF]" />
                    <div className="grid grid-cols-3 gap-3">
                      {[7, 32, 14].map((value) => (
                        <div key={value} className="rounded-lg border border-line bg-white p-4">
                          <div className="h-2 w-16 rounded-full bg-[#D6E8FF]" />
                          <div className="mt-4 text-2xl font-semibold text-primary">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <div className="mb-4 h-3 w-44 rounded-full bg-[#D6E8FF]" />
                      {[64, 78, 52, 88].map((width) => (
                        <div key={width} className="mb-3 flex items-center gap-3 last:mb-0">
                          <div className="h-2 w-24 rounded-full bg-slate-200" />
                          <div className="h-2 rounded-full bg-secondary" style={{ width: `${width}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-line bg-white p-4">
                      <div className="text-xs font-semibold uppercase text-slate-500">Axium Knowledge</div>
                      <div className="mt-3 h-2 w-40 rounded-full bg-[#D6E8FF]" />
                      <div className="mt-3 h-2 w-52 rounded-full bg-slate-200" />
                      <div className="mt-3 h-2 w-32 rounded-full bg-slate-200" />
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <div className="text-xs font-semibold uppercase text-slate-500">Source of truth</div>
                      <div className="mt-3 rounded-md bg-[#E8F3FF] px-3 py-2 text-xs font-semibold text-primary">Datorama Retail Dashboard</div>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <div className="text-xs font-semibold uppercase text-slate-500">Join risk</div>
                      <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-line">GA4 campaign to media data: medium</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6E8FF] bg-white px-3 py-1 text-sm font-medium text-secondary">
              <LockKeyhole className="h-4 w-4" />
              Private workspace analytics
            </div>
            <h1 className="text-5xl font-semibold tracking-normal text-primary md:text-6xl">
              Axium AI Analytics Platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Upload data, document the story behind your analytics ecosystem and ask Axium for grounded insights
              from the selected workspace only.
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
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-14 md:grid-cols-2 xl:grid-cols-4">
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
