import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { CHOICES, ACTIVE_INCIDENT_STATES, ACTIVE_PROBLEM_STATES, ACTIVE_CHANGE_STATES, label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";
import { formatDuration, markBreaches } from "@/lib/sla";
import { autoCloseResolved } from "@/lib/rules/incident";
import { BarList, Columns, StatTile } from "@/components/Charts";
import { PriorityBadge, StateBadge } from "@/components/Badges";

const DAY = 86400_000;

export default async function Dashboard() {
  const user = await requireUser();
  // Lightweight "scheduled jobs": run on dashboard load.
  await Promise.all([markBreaches(), autoCloseResolved(7)]);

  const openInc = { state: { in: ACTIVE_INCIDENT_STATES } };
  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = new Date(Date.now() - 13 * DAY);
  since14.setUTCHours(0, 0, 0, 0);

  const [
    openCount, p1Count, unassigned, breachedActive, openProblems, openChanges, myApprovals, openRitms,
    byPriority, byState, byGroup, recent, resolved30, slaDone, slaMet, upcoming, myWork,
  ] = await Promise.all([
    db.incident.count({ where: openInc }),
    db.incident.count({ where: { ...openInc, priority: 1 } }),
    db.incident.count({ where: { ...openInc, assignedToId: null } }),
    db.taskSla.count({ where: { stage: { in: ["in_progress", "paused"] }, hasBreached: true } }),
    db.problem.count({ where: { state: { in: ACTIVE_PROBLEM_STATES } } }),
    db.changeRequest.count({ where: { state: { in: ACTIVE_CHANGE_STATES } } }),
    db.approval.count({ where: { approverId: user.id, state: "requested" } }),
    db.requestItem.count({ where: { state: { in: ["open", "work_in_progress"] } } }),
    db.incident.groupBy({ by: ["priority"], where: openInc, _count: true }),
    db.incident.groupBy({ by: ["state"], where: openInc, _count: true }),
    db.incident.groupBy({ by: ["assignmentGroupId"], where: openInc, _count: true }),
    db.incident.findMany({ where: { openedAt: { gte: since14 } }, select: { openedAt: true } }),
    db.incident.findMany({ where: { resolvedAt: { gte: since30 } }, select: { openedAt: true, resolvedAt: true } }),
    db.taskSla.count({ where: { stage: "completed", endTime: { gte: since30 } } }),
    db.taskSla.count({ where: { stage: "completed", endTime: { gte: since30 }, hasBreached: false } }),
    db.changeRequest.findMany({ where: { state: { in: ["scheduled", "authorize", "implement"] }, plannedStart: { gte: new Date(Date.now() - DAY) } }, orderBy: { plannedStart: "asc" }, take: 5 }),
    db.incident.findMany({ where: { ...openInc, assignedToId: user.id }, orderBy: [{ priority: "asc" }, { openedAt: "asc" }], take: 8 }),
  ]);

  const groups = await db.group.findMany({ where: { id: { in: byGroup.map((g) => g.assignmentGroupId).filter((x): x is string => !!x) } } });
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "(Unassigned)";

  const days = Array.from({ length: 14 }, (_, i) => new Date(since14.getTime() + i * DAY));
  const perDay = days.map((d) => ({
    label: d.toISOString().slice(8, 10),
    value: recent.filter((r) => r.openedAt.toISOString().slice(0, 10) === d.toISOString().slice(0, 10)).length,
  }));
  const mttr = resolved30.length
    ? resolved30.reduce((s, r) => s + (r.resolvedAt!.getTime() - r.openedAt.getTime()), 0) / resolved30.length / 1000
    : 0;
  const compliance = slaDone ? Math.round((slaMet / slaDone) * 100) : null;
  const itil = hasRole(user, "itil");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-sn-dark">Service Operations Overview</h1>
          <p className="text-sm text-gray-500">Live view across incidents, problems, changes and requests</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">SLA compliance, last 30 days</div>
          <div className="text-5xl font-semibold tabular-nums text-gray-900">{compliance === null ? "—" : `${compliance}%`}</div>
          <div className="text-xs text-gray-500">{slaMet} of {slaDone} completed SLAs met · MTTR {resolved30.length ? formatDuration(mttr) : "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatTile label="Open incidents" value={openCount} href="/incident?filter=open" />
        <StatTile label="Critical open" value={p1Count} href="/incident?filter=p1" tone="critical" />
        <StatTile label="Unassigned" value={unassigned} href="/incident?filter=unassigned" tone="warning" />
        <StatTile label="SLAs breached" value={breachedActive} href="/sla/task?filter=breached" tone="critical" />
        <StatTile label="Open problems" value={openProblems} href="/problem?filter=open" />
        <StatTile label="Open changes" value={openChanges} href="/change?filter=open" />
        <StatTile label="Open requests" value={openRitms} href="/sc/ritm?filter=open" />
        <StatTile label="My approvals" value={myApprovals} href="/approvals" tone="warning" />
      </div>

      {itil && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Open incidents by priority</h2>
            <BarList data={CHOICES.priority.map((p) => ({
              label: p.label, value: byPriority.find((b) => String(b.priority) === p.value)?._count ?? 0,
            }))} />
          </div>
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Open incidents by state</h2>
            <BarList data={["new", "in_progress", "on_hold"].map((s) => ({ label: label("incidentState", s), value: byState.find((b) => b.state === s)?._count ?? 0 }))} />
          </div>
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Open incidents by assignment group</h2>
            <BarList data={byGroup.map((g) => ({ label: groupName(g.assignmentGroupId), value: g._count })).sort((a, b) => b.value - a.value)} />
          </div>
        </div>
      )}

      {itil && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Incidents opened per day, last 14 days</h2>
            <Columns data={perDay} />
          </div>
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Upcoming changes</h2>
            <ul className="space-y-2 text-sm">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <Link className="link" href={`/change/${c.id}`}>{c.number}</Link> <StateBadge list="changeState" value={c.state} />
                  <div className="truncate text-gray-700">{c.shortDescription}</div>
                  <div className="text-xs text-gray-500">{fmtDate(c.plannedStart)} · {label("changeType", c.type)}</div>
                </li>
              ))}
              {upcoming.length === 0 && <li className="text-gray-500">Nothing scheduled.</li>}
            </ul>
          </div>
        </div>
      )}

      {itil && (
        <div className="card">
          <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">My open incidents</h2>
          <table className="w-full text-sm">
            <tbody>
              {myWork.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-4 py-2"><Link className="link" href={`/incident/${i.id}`}>{i.number}</Link></td>
                  <td>{i.shortDescription}</td>
                  <td><PriorityBadge value={i.priority} /></td>
                  <td><StateBadge list="incidentState" value={i.state} /></td>
                  <td className="text-xs text-gray-500">{fmtDate(i.openedAt)}</td>
                </tr>
              ))}
              {myWork.length === 0 && <tr><td className="px-4 py-4 text-gray-500">Nothing assigned to you.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
