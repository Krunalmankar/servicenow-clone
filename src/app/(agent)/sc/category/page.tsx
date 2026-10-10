import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveCategoryAction } from "../actions";

export default async function Categories() {
  await requireRole("itil", "catalog_admin");
  const cats = await db.catalogCategory.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { items: true } } } });
  return (
    <div className="card">
      <h1 className="border-b border-gray-200 px-4 py-3 text-lg font-semibold text-sn-dark">Catalog Categories</h1>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600"><tr><th className="px-4 py-2">Icon</th><th>Name</th><th>Description</th><th>Order</th><th>Items</th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id} className="border-t border-gray-100"><td className="px-4 py-2">{c.icon}</td><td>{c.name}</td><td>{c.description}</td><td>{c.order}</td><td>{c._count.items}</td></tr>
          ))}
        </tbody>
      </table>
      <form action={saveCategoryAction} className="flex flex-wrap gap-2 border-t border-gray-200 p-4">
        <input name="icon" placeholder="Icon" className="input w-16" />
        <input name="name" placeholder="Name" className="input w-48" required />
        <input name="description" placeholder="Description" className="input w-80" />
        <input name="order" placeholder="Order" type="number" className="input w-24" />
        <button className="btn-primary">Add category</button>
      </form>
    </div>
  );
}
