import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label, CHOICES } from "@/lib/choices";
import { listParams, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";
import { StateBadge } from "@/components/Badges";

export default async function CmdbList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil", "cmdb_admin");
  const params = await searchParams;
  const lp = listParams(params, "name", "asc");
  const where: Prisma.ConfigurationItemWhereInput = {};
  if (lp.filter && lp.filter !== "all") where.ciClass = lp.filter;
  if (lp.q) where.OR = [{ name: { contains: lp.q } }, { ipAddress: { contains: lp.q } }, { os: { contains: lp.q } }];
  const sort = ["name", "ciClass", "status", "environment"].includes(lp.sort) ? lp.sort : "name";
  const [rows, total] = await Promise.all([
    db.configurationItem.findMany({ where, orderBy: { [sort]: lp.dir }, skip: lp.skip, take: lp.take, include: { supportGroup: true } }),
    db.configurationItem.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "name", label: "Name", sortable: true, render: (r) => r.name },
    { key: "ciClass", label: "Class", sortable: true, render: (r) => label("ciClass", r.ciClass) },
    { key: "status", label: "Status", sortable: true, render: (r) => <StateBadge list="ciStatus" value={r.status} /> },
    { key: "environment", label: "Environment", sortable: true, render: (r) => label("environment", r.environment) },
    { key: "ip", label: "IP address", render: (r) => r.ipAddress ?? "" },
    { key: "os", label: "OS / Version", render: (r) => r.os ?? "" },
    { key: "group", label: "Support group", render: (r) => r.supportGroup?.name ?? "" },
  ];
  return <ListView title="Configuration Items" basePath="/cmdb" newHref="/cmdb/new" rows={rows} total={total} columns={columns}
    rowHref={(r) => `/cmdb/${r.id}`} params={params} page={lp.page} sort={sort} dir={lp.dir} activeFilter={lp.filter || "all"}
    filters={[{ value: "all", label: "All" }, ...CHOICES.ciClass]} />;
}
