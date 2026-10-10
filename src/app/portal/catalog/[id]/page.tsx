import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { userOptions } from "@/lib/refs";
import { parseVariables } from "@/lib/rules/catalog";
import { ErrorBanner } from "@/components/ErrorBanner";
import { orderAction } from "../../actions";

export default async function ItemOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const item = await db.catalogItem.findUnique({ where: { id }, include: { category: true } });
  if (!item || !item.active) notFound();
  const users = await userOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/catalog" className="link text-sm">← Back to catalog</Link>
      <div className="mt-3 grid gap-6 md:grid-cols-[1fr_16rem]">
        <form action={orderAction} className="card space-y-4 p-6">
          <input type="hidden" name="itemId" value={item.id} />
          <div>
            <div className="text-xs text-gray-500">{item.category.icon} {item.category.name}</div>
            <h1 className="text-2xl font-semibold text-sn-dark">{item.name}</h1>
            <p className="text-sm text-gray-600">{item.description ?? item.shortDescription}</p>
          </div>
          <ErrorBanner error={error} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Requested for</span>
            <select name="requestedForId" className="input" defaultValue={user.id}>{users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
          </label>
          {parseVariables(item.variables).map((v) => (
            <label key={v.name} className={`block text-sm ${v.type === "checkbox" ? "flex items-center gap-2" : ""}`}>
              {v.type === "checkbox" ? (
                <><input type="checkbox" name={v.name} /> <span className="font-medium">{v.label}</span></>
              ) : (
                <>
                  <span className="mb-1 block font-medium">{v.label} {v.required && <span className="text-red-600">*</span>}</span>
                  {v.type === "textarea" ? <textarea name={v.name} rows={3} className="input" required={v.required} />
                    : v.type === "select" ? (
                      <select name={v.name} className="input" required={v.required}><option value="">-- Select --</option>{v.options?.map((o) => <option key={o}>{o}</option>)}</select>
                    ) : <input name={v.name} type={v.type === "date" ? "date" : "text"} className="input" required={v.required} />}
                </>
              )}
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Special instructions</span>
            <textarea name="instructions" rows={2} className="input" />
          </label>
          <div className="flex items-end gap-4">
            <label className="block text-sm"><span className="mb-1 block font-medium">Quantity</span><input name="quantity" type="number" min={1} max={20} defaultValue={1} className="input w-24" /></label>
            <button className="btn-primary px-6 py-2">Order now</button>
          </div>
        </form>
        <aside className="card h-fit space-y-2 p-5 text-sm">
          <div><span className="text-gray-500">Price</span><div className="text-xl font-semibold">{item.price ? `$${item.price.toFixed(2)}` : "No charge"}</div></div>
          <div><span className="text-gray-500">Delivery</span><div>{item.deliveryDays} business days</div></div>
          <div><span className="text-gray-500">Approval</span><div>{item.requiresApproval ? "Your manager will be asked to approve" : "Not required"}</div></div>
        </aside>
      </div>
    </div>
  );
}
