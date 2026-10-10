import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function RitmList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";
  const where: Prisma.RequestItemWhereInput = {};
  if (filter === "open") where.state = { in: ["open", "work_in_progress"] };
  if (filter === "my_groups") Object.assign(where, { state: { in: ["open", "work_in_progress"] }, assignmentGroupId: { in: user.groupIds } });
  if (filter === "approval") where.stage = "waiting_for_approval";
  if (lp.q) where.number = { contains: lp.q };
  const [rows, total] = await Promise.all([
    db.requestItem.findMany({ where, orderBy: { number: lp.dir }, skip: lp.skip, take: lp.take, include: { item: true, request: { include: { requestedFor: true } }, assignedTo: true } }),
    db.requestItem.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", render: (r) => r.number },
    { key: "item", label: "Item", render: (r) => r.item.name },
    { key: "for", label: "Requested for", render: (r) => `${r.request.requestedFor.firstName} ${r.request.requestedFor.lastName}` },
    { key: "stage", label: "Stage", render: (r) => <StateBadge list="ritmStage" value={r.stage} /> },
    { key: "state", label: "State", render: (r) => <StateBadge list="ritmState" value={r.state} /> },
    { key: "assignee", label: "Assigned to", render: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : "") },
    { key: "opened", label: "Opened", render: (r) => fmtDate(r.openedAt) },
  ];
  return <ListView title="Requested Items" basePath="/sc/ritm" rows={rows} total={total} columns={columns} rowHref={(r) => `/sc/ritm/${r.id}`}
    params={params} page={lp.page} sort="number" dir={lp.dir} activeFilter={filter}
    filters={[{ value: "open", label: "Open" }, { value: "my_groups", label: "My groups" }, { value: "approval", label: "Waiting for approval" }, { value: "all", label: "All" }]} />;
}
