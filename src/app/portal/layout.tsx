import Link from "next/link";
import { requireUser, isAgent } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pending = await db.approval.count({ where: { approverId: user.id, state: "requested" } });
  const links = [
    ["/portal", "Home"], ["/portal/catalog", "Request Something"], ["/portal/issue", "Report an Issue"],
    ["/portal/kb", "Knowledge"], ["/portal/requests", "My Requests"],
  ];
  return (
    <div className="min-h-screen">
      <header className="bg-sn-dark text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/portal" className="text-lg font-bold">now<span className="text-sn-accent">desk</span> <span className="font-normal text-gray-300">Service Portal</span></Link>
          <nav className="hidden gap-4 text-sm md:flex">
            {links.map(([href, l]) => <Link key={href} href={href} className="text-gray-200 hover:text-white">{l}</Link>)}
            {pending > 0 && <Link href="/portal/approvals" className="rounded bg-amber-500 px-2 font-semibold">Approvals ({pending})</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            {isAgent(user) && <Link href="/dashboard" className="text-gray-300 hover:text-white">Agent workspace</Link>}
            <span>{user.name}</span>
            <form action="/logout" method="post"><button className="text-gray-300 hover:text-white">Log out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
