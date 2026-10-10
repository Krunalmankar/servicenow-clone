import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { listParams, type SearchParams } from "@/lib/list";
import { ListView, type Column } from "@/components/ListView";

export default async function ItemList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil", "catalog_admin");
  const params = await searchParams;
  const lp = listParams(params, "name", "asc");
  const where = lp.q ? { name: { contains: lp.q } } : {};
  const [rows, total] = await Promise.all([
    db.catalogItem.findMany({ where, orderBy: { name: lp.dir }, skip: lp.skip, take: lp.take, include: { category: true, fulfillmentGroup: true } }),
    db.catalogItem.count({ where }),
  ]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "name", label: "Name", render: (r) => r.name },
    { key: "shortDescription", label: "Short description", render: (r) => r.shortDescription },
    { key: "category", label: "Category", render: (r) => r.category.name },
    { key: "price", label: "Price", render: (r) => (r.price ? `$${r.price.toFixed(2)}` : "Free") },
    { key: "approval", label: "Approval", render: (r) => (r.requiresApproval ? "Manager" : "None") },
    { key: "group", label: "Fulfilment group", render: (r) => r.fulfillmentGroup?.name ?? "" },
    { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
  ];
  return <ListView title="Catalog Items" basePath="/sc/item" newHref="/sc/item/new" rows={rows} total={total} columns={columns}
    rowHref={(r) => `/sc/item/${r.id}`} params={params} page={lp.page} sort="name" dir={lp.dir} />;
}
