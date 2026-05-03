"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Files, Home, LogOut, MessageSquareText, Settings, UsersRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/workspaces", label: "Workspaces", icon: UsersRound },
  { href: "/dashboard/files", label: "Files", icon: Files },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquareText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-line bg-white p-4 lg:w-72">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-primary">Analytics AI</div>
          <div className="text-xs text-slate-500">Platform</div>
        </div>
      </Link>

      <div className="mb-5">
        <WorkspaceSwitcher />
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-[#E8F3FF] text-primary" : "text-slate-600 hover:bg-panel hover:text-primary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-panel hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
