import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";

export default async function Users({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("admin");
  const params = await searchParams;
  const lp = listParams(params, "userName", "asc");
  const where = lp.q ? { OR: [{ userName: { contains: lp.q } }, { firstName: { contains: lp.q } }, { lastName: { contains: lp.q } }, { email: { contains: lp.q } }] } : {};
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { userName: lp.dir }, skip: lp.skip, take: lp.take, include: { roles: { include: { role: true } }, memberships: { include: { group: true } } } }),
    db.user.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "userName", label: "User ID", render: (r) => r.userName },
    { key: "name", label: "Name", render: (r) => `${r.firstName} ${r.lastName}` },
    { key: "email", label: "Email", render: (r) => r.email },
    { key: "title", label: "Title", render: (r) => r.title ?? "" },
    { key: "dept", label: "Department", render: (r) => r.department ?? "" },
    { key: "roles", label: "Direct roles", render: (r) => r.roles.map((x) => x.role.name).join(", ") },
    { key: "groups", label: "Groups", render: (r) => r.memberships.map((m) => m.group.name).join(", ") },
    { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
  ];
  return <ListView title="Users" basePath="/admin/users" newHref="/admin/users/new" rows={rows} total={total} columns={columns}
    rowHref={(r) => `/admin/users/${r.id}`} params={params} page={lp.page} sort="userName" dir={lp.dir} />;
}
