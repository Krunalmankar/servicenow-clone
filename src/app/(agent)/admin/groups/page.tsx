import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";

export default async function Groups({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("admin");
  const params = await searchParams;
  const lp = listParams(params, "name", "asc");
  const where = lp.q ? { name: { contains: lp.q } } : {};
  const [rows, total] = await Promise.all([
    db.group.findMany({ where, orderBy: { name: lp.dir }, skip: lp.skip, take: lp.take, include: { manager: true, roles: { include: { role: true } }, _count: { select: { members: true } } } }),
    db.group.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "name", label: "Name", render: (r) => r.name },
    { key: "description", label: "Description", render: (r) => r.description ?? "" },
    { key: "manager", label: "Manager", render: (r) => (r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : "") },
    { key: "members", label: "Members", render: (r) => r._count.members },
    { key: "roles", label: "Roles", render: (r) => r.roles.map((x) => x.role.name).join(", ") },
    { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
  ];
  return <ListView title="Groups" basePath="/admin/groups" newHref="/admin/groups/new" rows={rows} total={total} columns={columns}
    rowHref={(r) => `/admin/groups/${r.id}`} params={params} page={lp.page} sort="name" dir={lp.dir} />;
}
