import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/choices";
import { fmtDate, listParams, qs, PAGE_SIZE, type SearchParams } from "@/lib/list";
import { formatDuration, markBreaches, slaProgress } from "@/lib/sla";
import { recordNumbers, TABLE_PATH } from "@/lib/records";
import { StateBadge } from "@/components/Badges";

export default async function TaskSlas({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil");
  await markBreaches();
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "active";
  const where: Prisma.TaskSlaWhereInput = {};
  if (filter === "active") where.stage = { in: ["in_progress", "paused"] };
  if (filter === "breached") where.hasBreached = true;
  const [rows, total] = await Promise.all([
    db.taskSla.findMany({ where, include: { sla: true }, orderBy: { breachTime: "asc" }, skip: lp.skip, take: lp.take }),
    db.taskSla.count({ where }),
  ]);
  const numbers: Record<string, string> = {};
  for (const table of new Set(rows.map((r) => r.table))) Object.assign(numbers, await recordNumbers(table, rows.filter((r) => r.table === table).map((r) => r.recordId)));
  const filters = [["active", "Active"], ["breached", "Breached"], ["all", "All"]];
  return (
    <div className="card">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3"><h1 className="text-lg font-semibold text-sn-dark">Task SLAs</h1></div>
      <div className="flex gap-1 border-b border-gray-100 px-4 py-2 text-sm">
        {filters.map(([v, l]) => <Link key={v} href={`/sla/task${qs({}, { filter: v })}`} className={`rounded px-2 py-1 ${filter === v ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>{l}</Link>)}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
          <tr><th className="px-4 py-2">Task</th><th>SLA</th><th>Stage</th><th className="w-1/4">Elapsed %</th><th>Time left</th><th>Breach time</th><th>Breached</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const p = slaProgress(t);
            const bar = p.breached ? "bg-red-500" : p.percent >= 75 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-2"><Link className="link" href={`${TABLE_PATH[t.table]}/${t.recordId}`}>{numbers[t.recordId] ?? label("slaTable", t.table)}</Link></td>
                <td>{t.sla.name}</td>
                <td><StateBadge list="slaStage" value={t.stage} /></td>
                <td><div className="flex items-center gap-2 pr-4"><div className="h-2 flex-1 rounded bg-gray-200"><div className={`h-2 rounded ${bar}`} style={{ width: `${Math.min(100, p.percent)}%` }} /></div><span className="w-10 text-right text-xs">{p.percent}%</span></div></td>
                <td className={p.breached ? "text-red-600" : ""}>{["completed", "cancelled"].includes(t.stage) ? "—" : formatDuration(p.remaining)}</td>
                <td className="whitespace-nowrap text-xs">{fmtDate(t.breachTime)}</td>
                <td>{p.breached ? <span className="font-semibold text-red-600">Yes</span> : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <span>{total} records</span>
        <div className="flex gap-2">
          {lp.page > 1 && <Link className="btn-secondary" href={`/sla/task${qs(params, { page: lp.page - 1 })}`}>Previous</Link>}
          {lp.page * PAGE_SIZE < total && <Link className="btn-secondary" href={`/sla/task${qs(params, { page: lp.page + 1 })}`}>Next</Link>}
        </div>
      </div>
    </div>
  );
}
