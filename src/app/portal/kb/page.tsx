import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CHOICES, label } from "@/lib/choices";
import { searchArticles } from "@/lib/rules/knowledge";

export default async function PortalKb({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  await requireUser();
  const { q = "", category } = await searchParams;
  const articles = q
    ? await searchArticles(q, 30)
    : await db.knowledgeArticle.findMany({ where: { state: "published", ...(category ? { category } : {}) }, orderBy: { views: "desc" }, take: 30 });
  const items = q ? await db.catalogItem.findMany({ where: { active: true, OR: [{ name: { contains: q } }, { shortDescription: { contains: q } }] }, take: 5 }) : [];
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <aside className="card h-fit p-3 text-sm">
        <Link href="/portal/kb" className={`block rounded px-2 py-1.5 ${!category ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>All articles</Link>
        {CHOICES.kbCategory.map((c) => (
          <Link key={c.value} href={`/portal/kb?category=${c.value}`} className={`block rounded px-2 py-1.5 ${category === c.value ? "bg-sn-dark text-white" : "hover:bg-gray-100"}`}>{c.label}</Link>
        ))}
      </aside>
      <div>
        <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Search knowledge" className="input" /><button className="btn-primary">Search</button></form>
        {q && <p className="mb-3 text-sm text-gray-600">{articles.length} article{articles.length === 1 ? "" : "s"} for “{q}”</p>}
        {items.length > 0 && (
          <div className="card mb-4 p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Catalog items</h2>
            {items.map((i) => <div key={i.id}><Link className="link" href={`/portal/catalog/${i.id}`}>{i.name}</Link> <span className="text-sm text-gray-500">{i.shortDescription}</span></div>)}
          </div>
        )}
        <div className="space-y-3">
          {articles.map((a) => (
            <Link key={a.id} href={`/portal/kb/${a.id}`} className="card block p-4 hover:shadow-md">
              <div className="font-semibold text-sn-dark">{a.title}</div>
              <div className="mt-1 line-clamp-2 text-sm text-gray-600">{a.body.replace(/[#*`]/g, "").slice(0, 220)}</div>
              <div className="mt-2 text-xs text-gray-500">{a.number} · {label("kbCategory", a.category)} · {a.views} views</div>
            </Link>
          ))}
          {articles.length === 0 && <div className="card p-6 text-sm text-gray-600">No articles found. <Link className="link" href="/portal/issue">Report an issue</Link> instead.</div>}
        </div>
      </div>
    </div>
  );
}
