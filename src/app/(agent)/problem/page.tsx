import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ACTIVE_PROBLEM_STATES } from "@/lib/choices";
import { ListView, type Column } from "@/components/ListView";
import { PriorityBadge, StateBadge } from "@/components/Badges";

export default async function ProblemList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";
  const where: Prisma.ProblemWhereInput = {};
  if (filter === "open") where.state = { in: ACTIVE_PROBLEM_STATES };
  if (filter === "known_error") where.knownError = true;
  if (lp.q) where.OR = [{ number: { contains: lp.q } }, { shortDescription: { contains: lp.q } }];
  const sort = ["number", "priority", "state", "openedAt"].includes(lp.sort) ? lp.sort : "number";
  const [rows, total] = await Promise.all([
    db.problem.findMany({ where, orderBy: { [sort]: lp.dir }, skip: lp.skip, take: lp.take, include: { assignmentGroup: true, assignedTo: true, _count: { select: { incidents: true } } } }),
    db.problem.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", sortable: true, render: (r) => r.number },
    { key: "shortDescription", label: "Problem statement", render: (r) => r.shortDescription },
    { key: "priority", label: "Priority", sortable: true, render: (r) => <PriorityBadge value={r.priority} /> },
    { key: "state", label: "State", sortable: true, render: (r) => <StateBadge list="problemState" value={r.state} /> },
    { key: "ke", label: "Known error", render: (r) => (r.knownError ? "Yes" : "") },
    { key: "inc", label: "Incidents", render: (r) => r._count.incidents },
    { key: "group", label: "Assignment group", render: (r) => r.assignmentGroup?.name ?? "" },
    { key: "assignee", label: "Assigned to", render: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : "") },
    { key: "openedAt", label: "Opened", sortable: true, render: (r) => fmtDate(r.openedAt) },
  ];
  return (
    <ListView title="Problems" basePath="/problem" newHref="/problem/new" rows={rows} total={total} columns={columns}
      rowHref={(r) => `/problem/${r.id}`} params={params} page={lp.page} sort={sort} dir={lp.dir} activeFilter={filter}
      filters={[{ value: "open", label: "Open" }, { value: "known_error", label: "Known errors" }, { value: "all", label: "All" }]} />
  );
}
