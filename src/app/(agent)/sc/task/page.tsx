import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, fmtDate, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function TaskList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params);
  const filter = lp.filter || "open";
  const where: Prisma.CatalogTaskWhereInput = {};
  if (filter !== "all") where.state = { in: ["open", "work_in_progress"] };
  if (filter === "mine") where.assignedToId = user.id;
  if (filter === "my_groups") where.assignmentGroupId = { in: user.groupIds };
  if (lp.q) where.OR = [{ number: { contains: lp.q } }, { shortDescription: { contains: lp.q } }];
  const [rows, total] = await Promise.all([
    db.catalogTask.findMany({ where, orderBy: { number: lp.dir }, skip: lp.skip, take: lp.take, include: { ritm: true, assignmentGroup: true, assignedTo: true } }),
    db.catalogTask.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "number", label: "Number", render: (r) => r.number },
    { key: "shortDescription", label: "Short description", render: (r) => r.shortDescription },
    { key: "ritm", label: "Requested item", render: (r) => r.ritm.number },
    { key: "state", label: "State", render: (r) => <StateBadge list="ritmState" value={r.state} /> },
    { key: "group", label: "Assignment group", render: (r) => r.assignmentGroup?.name ?? "" },
    { key: "assignee", label: "Assigned to", render: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : "") },
    { key: "opened", label: "Opened", render: (r) => fmtDate(r.openedAt) },
  ];
  return <ListView title="Catalog Tasks" basePath="/sc/task" rows={rows} total={total} columns={columns} rowHref={(r) => `/sc/task/${r.id}`}
    params={params} page={lp.page} sort="number" dir={lp.dir} activeFilter={filter}
    filters={[{ value: "open", label: "Open" }, { value: "mine", label: "Assigned to me" }, { value: "my_groups", label: "My groups" }, { value: "all", label: "All" }]} />;
}
