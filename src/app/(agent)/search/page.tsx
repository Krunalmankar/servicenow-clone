import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, isAgent } from "@/lib/auth";
import { label } from "@/lib/choices";

/** Global search across task tables, CMDB and knowledge. An exact record number jumps straight to it. */
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  if (!isAgent(user)) redirect(`/portal/kb?q=${encodeURIComponent((await searchParams).q ?? "")}`);
  const q = ((await searchParams).q ?? "").trim();
  if (!q) redirect("/dashboard");

  const num = q.toUpperCase();
  const exact = await Promise.all([
    db.incident.findUnique({ where: { number: num } }).then((r) => r && `/incident/${r.id}`),
    db.problem.findUnique({ where: { number: num } }).then((r) => r && `/problem/${r.id}`),
    db.changeRequest.findUnique({ where: { number: num } }).then((r) => r && `/change/${r.id}`),
    db.requestItem.findUnique({ where: { number: num } }).then((r) => r && `/sc/ritm/${r.id}`),
    db.request.findUnique({ where: { number: num } }).then((r) => r && `/sc/request/${r.id}`),
    db.catalogTask.findUnique({ where: { number: num } }).then((r) => r && `/sc/task/${r.id}`),
    db.knowledgeArticle.findUnique({ where: { number: num } }).then((r) => r && `/kb/${r.id}`),
  ]);
  const hit = exact.find(Boolean);
  if (hit) redirect(hit);

  const text = { contains: q };
  const [incidents, problems, changes, cis, articles] = await Promise.all([
    db.incident.findMany({ where: { OR: [{ shortDescription: text }, { description: text }] }, take: 10, orderBy: { openedAt: "desc" } }),
    db.problem.findMany({ where: { OR: [{ shortDescription: text }, { description: text }] }, take: 10 }),
    db.changeRequest.findMany({ where: { OR: [{ shortDescription: text }, { description: text }] }, take: 10 }),
    db.configurationItem.findMany({ where: { OR: [{ name: text }, { ipAddress: text }] }, take: 10 }),
    db.knowledgeArticle.findMany({ where: { OR: [{ title: text }, { body: text }] }, take: 10 }),
  ]);
  const groups: { title: string; rows: { href: string; number: string; text: string; meta: string }[] }[] = [
    { title: "Incidents", rows: incidents.map((r) => ({ href: `/incident/${r.id}`, number: r.number, text: r.shortDescription, meta: label("incidentState", r.state) })) },
    { title: "Problems", rows: problems.map((r) => ({ href: `/problem/${r.id}`, number: r.number, text: r.shortDescription, meta: label("problemState", r.state) })) },
    { title: "Changes", rows: changes.map((r) => ({ href: `/change/${r.id}`, number: r.number, text: r.shortDescription, meta: label("changeState", r.state) })) },
    { title: "Configuration items", rows: cis.map((r) => ({ href: `/cmdb/${r.id}`, number: r.name, text: label("ciClass", r.ciClass), meta: r.ipAddress ?? "" })) },
    { title: "Knowledge", rows: articles.map((r) => ({ href: `/kb/${r.id}`, number: r.number, text: r.title, meta: label("kbState", r.state) })) },
  ];
  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-sn-dark">Search results for “{q}” <span className="text-sm font-normal text-gray-500">({total})</span></h1>
      {groups.filter((g) => g.rows.length).map((g) => (
        <div key={g.title} className="card">
          <h2 className="border-b border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">{g.title}</h2>
          <ul>
            {g.rows.map((r) => (
              <li key={r.href} className="flex gap-3 border-t border-gray-100 px-4 py-2 text-sm first:border-0">
                <Link className="link w-32 shrink-0" href={r.href}>{r.number}</Link><span className="flex-1">{r.text}</span><span className="text-gray-500">{r.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {total === 0 && <div className="card p-6 text-sm text-gray-500">No matches.</div>}
    </div>
  );
}
