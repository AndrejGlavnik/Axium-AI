import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F3FF] text-secondary">
        <Inbox className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-primary">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}
