import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";

const DAY = 86400_000;

/** Change schedule: a 14-day timeline of planned change windows, grouped by CI. */
export default async function ChangeSchedule() {
  await requireRole("itil");
  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  start.setTime(start.getTime() - 2 * DAY);
  const end = new Date(start.getTime() + 14 * DAY);
  const changes = await db.changeRequest.findMany({
    where: { plannedStart: { lt: end }, plannedEnd: { gt: start }, state: { not: "canceled" } },
    include: { ci: true }, orderBy: { plannedStart: "asc" },
  });
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));
  const tone: Record<string, string> = { normal: "bg-sky-500", standard: "bg-emerald-500", emergency: "bg-red-500" };
  const days = Array.from({ length: 14 }, (_, i) => new Date(start.getTime() + i * DAY));
  return (
    <div className="card p-4">
      <h1 className="mb-1 text-lg font-semibold text-sn-dark">Change Schedule</h1>
      <p className="mb-4 text-sm text-gray-500">Planned windows for the next two weeks (UTC). <span className="ml-2 inline-block h-2 w-3 bg-sky-500" /> Normal <span className="ml-2 inline-block h-2 w-3 bg-emerald-500" /> Standard <span className="ml-2 inline-block h-2 w-3 bg-red-500" /> Emergency</p>
      <div className="grid grid-cols-[16rem_1fr] text-xs">
        <div />
        <div className="relative flex border-b border-gray-200">
          {days.map((d) => <div key={d.toISOString()} className="flex-1 border-l border-gray-100 px-1 py-1 text-gray-500">{d.toISOString().slice(5, 10)}</div>)}
          <div className="absolute inset-y-0 w-0.5 bg-red-400" style={{ left: `${pct(new Date())}%` }} title="Now" />
        </div>
        {changes.map((c) => (
          <div key={c.id} className="contents">
            <div className="truncate border-b border-gray-100 py-2 pr-2">
              <Link href={`/change/${c.id}`} className="link">{c.number}</Link> <span className="text-gray-500">{c.ci?.name}</span>
              <div className="truncate text-gray-600">{c.shortDescription}</div>
            </div>
            <div className="relative border-b border-gray-100">
              <div
                className={`absolute top-3 h-5 rounded ${tone[c.type]} opacity-80`}
                style={{ left: `${pct(c.plannedStart!)}%`, width: `${Math.max(0.6, pct(c.plannedEnd!) - pct(c.plannedStart!))}%` }}
                title={`${fmtDate(c.plannedStart)} → ${fmtDate(c.plannedEnd)} · ${label("changeState", c.state)}`}
              />
            </div>
          </div>
        ))}
        {changes.length === 0 && <div className="col-span-2 py-6 text-center text-gray-500">No changes scheduled in this window.</div>}
      </div>
    </div>
  );
}
