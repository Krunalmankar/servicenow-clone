import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ACTIVE_INCIDENT_STATES } from "@/lib/choices";
import { StateBadge } from "@/components/Badges";

export default async function PortalHome() {
  const user = await requireUser();
  const [popular, myInc, myRitms] = await Promise.all([
    db.knowledgeArticle.findMany({ where: { state: "published" }, orderBy: { views: "desc" }, take: 5 }),
    db.incident.findMany({ where: { callerId: user.id, state: { in: [...ACTIVE_INCIDENT_STATES, "resolved"] } }, orderBy: { openedAt: "desc" }, take: 5 }),
    db.requestItem.findMany({ where: { request: { requestedForId: user.id }, state: { in: ["open", "work_in_progress"] } }, include: { item: true }, orderBy: { openedAt: "desc" }, take: 5 }),
  ]);
  const tiles = [
    { href: "/portal/issue", icon: "🛠️", title: "Report an Issue", text: "Something broken? Let the Service Desk know." },
    { href: "/portal/catalog", icon: "🛒", title: "Request Something", text: "Hardware, software, access and services." },
    { href: "/portal/kb", icon: "📚", title: "Knowledge Base", text: "Find answers and how-to guides." },
    { href: "/portal/requests", icon: "📋", title: "My Requests", text: "Track your incidents and requests." },
  ];
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-br from-sn-dark to-sn-accent-dark px-8 py-12 text-center text-white">
        <h1 className="text-3xl font-semibold">How can we help, {user.name.split(" ")[0]}?</h1>
        <form action="/portal/kb" className="mx-auto mt-6 flex max-w-xl gap-2">
          <input name="q" placeholder="Search knowledge and catalog…" className="flex-1 rounded bg-white px-4 py-2 text-gray-900" />
          <button className="rounded bg-white px-4 font-medium text-sn-dark">Search</button>
        </form>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-3xl">{t.icon}</div>
            <div className="mt-2 font-semibold text-sn-dark">{t.title}</div>
            <div className="text-sm text-gray-600">{t.text}</div>
          </Link>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-sn-dark">My open items</h2>
          <ul className="space-y-2 text-sm">
            {myInc.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <Link className="link" href={`/portal/ticket/incident/${i.id}`}>{i.number}</Link><span className="flex-1 truncate">{i.shortDescription}</span><StateBadge list="incidentState" value={i.state} />
              </li>
            ))}
            {myRitms.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <Link className="link" href={`/portal/ticket/sc_req_item/${r.id}`}>{r.number}</Link><span className="flex-1 truncate">{r.item.name}</span><StateBadge list="ritmStage" value={r.stage} />
              </li>
            ))}
            {myInc.length + myRitms.length === 0 && <li className="text-gray-500">You have no open items.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-sn-dark">Popular articles</h2>
          <ul className="space-y-2 text-sm">
            {popular.map((a) => <li key={a.id}><Link className="link" href={`/portal/kb/${a.id}`}>{a.title}</Link> <span className="text-xs text-gray-500">{a.views} views</span></li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
