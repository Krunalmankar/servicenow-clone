import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ACTIVE_INCIDENT_STATES } from "@/lib/choices";
import { ListView, type Column } from "@/components/ListView";
import { PriorityBadge, StateBadge } from "@/components/Badges";

const SORTABLE = ["number", "priority", "state", "openedAt", "updatedAt", "shortDescription"];

export default async function IncidentList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";

  const where: Prisma.IncidentWhereInput = {};
  if (filter === "open") where.state = { in: ACTIVE_INCIDENT_STATES };
  if (filter === "mine") Object.assign(where, { assignedToId: user.id, state: { in: ACTIVE_INCIDENT_STATES } });
  if (filter === "my_groups") Object.assign(where, { assignmentGroupId: { in: user.groupIds }, state: { in: ACTIVE_INCIDENT_STATES } });
  if (filter === "unassigned") Object.assign(where, { assignedToId: null, state: { in: ACTIVE_INCIDENT_STATES } });
  if (filter === "resolved") where.state = "resolved";
  if (filter === "p1") Object.assign(where, { priority: 1, state: { in: ACTIVE_INCIDENT_STATES } });
  if (lp.q) where.OR = [{ number: { contains: lp.q } }, { shortDescription: { contains: lp.q } }, { description: { contains: lp.q } }];

  const sort = SORTABLE.includes(lp.sort) ? lp.sort : "number";
  const [rows, total] = await Promise.all([
    db.incident.findMany({
      where, orderBy: { [sort]: lp.dir }, skip: lp.skip, take: lp.take,
      include: { caller: true, assignmentGroup: true, assignedTo: true },
    }),
    db.incident.count({ where }),
  ]);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", sortable: true, render: (r) => r.number },
    { key: "openedAt", label: "Opened", sortable: true, render: (r) => fmtDate(r.openedAt) },
    { key: "shortDescription", label: "Short description", sortable: true, render: (r) => r.shortDescription },
    { key: "caller", label: "Caller", render: (r) => `${r.caller.firstName} ${r.caller.lastName}` },
    { key: "priority", label: "Priority", sortable: true, render: (r) => <PriorityBadge value={r.priority} /> },
    { key: "state", label: "State", sortable: true, render: (r) => <StateBadge list="incidentState" value={r.state} /> },
    { key: "group", label: "Assignment group", render: (r) => r.assignmentGroup?.name ?? "" },
    { key: "assignee", label: "Assigned to", render: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : "") },
    { key: "updatedAt", label: "Updated", sortable: true, render: (r) => fmtDate(r.updatedAt) },
  ];

  return (
    <ListView
      title="Incidents" basePath="/incident" newHref="/incident/new" rows={rows} total={total} columns={columns}
      rowHref={(r) => `/incident/${r.id}`} params={params} page={lp.page} sort={sort} dir={lp.dir}
      activeFilter={filter}
      filters={[
        { value: "open", label: "Open" }, { value: "mine", label: "Assigned to me" }, { value: "my_groups", label: "My groups" },
        { value: "unassigned", label: "Unassigned" }, { value: "p1", label: "Critical" }, { value: "resolved", label: "Resolved" },
        { value: "all", label: "All" },
      ]}
    />
  );
}
