import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function RequestList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";
  const where: Prisma.RequestWhereInput = filter === "open" ? { state: "open" } : {};
  if (lp.q) where.number = { contains: lp.q };
  const [rows, total] = await Promise.all([
    db.request.findMany({ where, orderBy: { number: lp.dir }, skip: lp.skip, take: lp.take, include: { requestedFor: true, _count: { select: { items: true } } } }),
    db.request.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", sortable: true, render: (r) => r.number },
    { key: "for", label: "Requested for", render: (r) => `${r.requestedFor.firstName} ${r.requestedFor.lastName}` },
    { key: "state", label: "State", render: (r) => <StateBadge list="requestState" value={r.state} /> },
    { key: "approval", label: "Approval", render: (r) => <StateBadge list="approval" value={r.approval} /> },
    { key: "items", label: "Items", render: (r) => r._count.items },
    { key: "opened", label: "Opened", render: (r) => fmtDate(r.openedAt) },
    { key: "due", label: "Due", render: (r) => fmtDate(r.dueDate) },
  ];
  return <ListView title="Requests" basePath="/sc/request" rows={rows} total={total} columns={columns} rowHref={(r) => `/sc/request/${r.id}`}
    params={params} page={lp.page} sort="number" dir={lp.dir} activeFilter={filter} filters={[{ value: "open", label: "Open" }, { value: "all", label: "All" }]} />;
}
