import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/list";
import { StateBadge } from "@/components/Badges";

export default async function MyRequests({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser();
  const { show } = await searchParams;
  const closed = show === "closed";
  const [incidents, ritms] = await Promise.all([
    db.incident.findMany({ where: { callerId: user.id, state: closed ? { in: ["closed", "canceled"] } : { notIn: ["closed", "canceled"] } }, orderBy: { openedAt: "desc" } }),
    db.requestItem.findMany({
      where: { request: { OR: [{ requestedForId: user.id }, { requestedById: user.id }] }, state: closed ? { startsWith: "closed" } : { in: ["open", "work_in_progress"] } },
      include: { item: true }, orderBy: { openedAt: "desc" },
    }),
  ]);
  const rows = [
    ...incidents.map((i) => ({ key: i.id, href: `/portal/ticket/incident/${i.id}`, number: i.number, title: i.shortDescription, at: i.openedAt, badge: <StateBadge list="incidentState" value={i.state} /> })),
    ...ritms.map((r) => ({ key: r.id, href: `/portal/ticket/sc_req_item/${r.id}`, number: r.number, title: r.item.name, at: r.openedAt, badge: <StateBadge list="ritmStage" value={r.stage} /> })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-sn-dark">My Requests</h1>
        <Link href="/portal/requests" className={`rounded px-2 py-1 text-sm ${!closed ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>Open</Link>
        <Link href="/portal/requests?show=closed" className={`rounded px-2 py-1 text-sm ${closed ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>Closed</Link>
      </div>
      <div className="card divide-y divide-gray-100">
        {rows.map((r) => (
          <Link key={r.key} href={r.href} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-gray-50">
            <span className="w-28 font-medium text-sky-700">{r.number}</span><span className="flex-1">{r.title}</span><span className="text-xs text-gray-500">{fmtDate(r.at)}</span>{r.badge}
          </Link>
        ))}
        {rows.length === 0 && <div className="p-6 text-sm text-gray-500">Nothing here.</div>}
      </div>
    </div>
  );
}
