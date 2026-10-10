import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

export function TopBar({ user, pendingApprovals, home = "/dashboard" }: { user: SessionUser; pendingApprovals?: number; home?: string }) {
  return (
    <header className="flex h-12 items-center gap-4 bg-sn-dark px-4 text-white">
      <Link href={home} className="text-lg font-bold tracking-tight">now<span className="text-sn-accent">desk</span></Link>
      <form action="/search" className="ml-6 hidden md:block">
        <input name="q" placeholder="Search INC, CHG, KB…" className="w-72 rounded bg-white/10 px-3 py-1 text-sm placeholder:text-gray-300 focus:bg-white focus:text-gray-900 focus:outline-none" />
      </form>
      <div className="ml-auto flex items-center gap-4 text-sm">
        {pendingApprovals ? (
          <Link href="/approvals" className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{pendingApprovals} approval{pendingApprovals > 1 ? "s" : ""}</Link>
        ) : null}
        <span title={user.roles.join(", ")}>{user.name}</span>
        <form action="/logout" method="post"><button className="text-gray-300 hover:text-white">Log out</button></form>
      </div>
    </header>
  );
}
