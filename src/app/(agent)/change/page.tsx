import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label, ACTIVE_CHANGE_STATES } from "@/lib/choices";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function ChangeList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";
  const where: Prisma.ChangeRequestWhereInput = {};
  if (filter === "open") where.state = { in: ACTIVE_CHANGE_STATES };
  if (filter === "authorize") where.state = "authorize";
  if (filter === "emergency") where.type = "emergency";
  if (lp.q) where.OR = [{ number: { contains: lp.q } }, { shortDescription: { contains: lp.q } }];
  const sort = ["number", "state", "plannedStart", "type", "risk"].includes(lp.sort) ? lp.sort : "number";
  const [rows, total] = await Promise.all([
    db.changeRequest.findMany({ where, orderBy: { [sort]: lp.dir }, skip: lp.skip, take: lp.take, include: { assignmentGroup: true, ci: true } }),
    db.changeRequest.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", sortable: true, render: (r) => r.number },
    { key: "shortDescription", label: "Short description", render: (r) => r.shortDescription },
    { key: "type", label: "Type", sortable: true, render: (r) => label("changeType", r.type) },
    { key: "state", label: "State", sortable: true, render: (r) => <StateBadge list="changeState" value={r.state} /> },
    { key: "approval", label: "Approval", render: (r) => <StateBadge list="approval" value={r.approval} /> },
    { key: "risk", label: "Risk", sortable: true, render: (r) => label("changeRisk", r.risk) },
    { key: "ci", label: "CI", render: (r) => r.ci?.name ?? "" },
    { key: "plannedStart", label: "Planned start", sortable: true, render: (r) => fmtDate(r.plannedStart) },
    { key: "group", label: "Assignment group", render: (r) => r.assignmentGroup?.name ?? "" },
  ];
  return (
    <ListView title="Change Requests" basePath="/change" newHref="/change/new" rows={rows} total={total} columns={columns}
      rowHref={(r) => `/change/${r.id}`} params={params} page={lp.page} sort={sort} dir={lp.dir} activeFilter={filter}
      filters={[{ value: "open", label: "Open" }, { value: "authorize", label: "Awaiting authorization" }, { value: "emergency", label: "Emergency" }, { value: "all", label: "All" }]} />
  );
}
