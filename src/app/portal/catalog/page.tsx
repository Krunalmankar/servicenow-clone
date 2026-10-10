import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function Catalog({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  await requireUser();
  const { category, q } = await searchParams;
  const [categories, items] = await Promise.all([
    db.catalogCategory.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { items: { where: { active: true } } } } } }),
    db.catalogItem.findMany({
      where: { active: true, ...(category ? { categoryId: category } : {}), ...(q ? { OR: [{ name: { contains: q } }, { shortDescription: { contains: q } }] } : {}) },
      include: { category: true }, orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <aside className="card h-fit p-3 text-sm">
        <Link href="/portal/catalog" className={`block rounded px-2 py-1.5 ${!category ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>All items</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/portal/catalog?category=${c.id}`} className={`flex justify-between rounded px-2 py-1.5 ${category === c.id ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>
            <span>{c.icon} {c.name}</span><span className="opacity-60">{c._count.items}</span>
          </Link>
        ))}
      </aside>
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-sn-dark">Service Catalog</h1>
          <form className="flex gap-2">{category && <input type="hidden" name="category" value={category} />}<input name="q" defaultValue={q} placeholder="Search catalog" className="input w-64" /><button className="btn-secondary">Search</button></form>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <Link key={i.id} href={`/portal/catalog/${i.id}`} className="card flex flex-col p-5 transition hover:shadow-md">
              <div className="text-xs text-gray-500">{i.category.icon} {i.category.name}</div>
              <div className="mt-1 font-semibold text-sn-dark">{i.name}</div>
              <div className="flex-1 text-sm text-gray-600">{i.shortDescription}</div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>{i.price ? `$${i.price.toFixed(2)}` : "No charge"}</span><span>{i.deliveryDays} day delivery</span>
              </div>
            </Link>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">No items found.</p>}
        </div>
      </div>
    </div>
  );
}
