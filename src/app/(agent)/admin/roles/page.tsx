import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createRoleAction } from "../actions";

export default async function Roles({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  const { error } = await searchParams;
  const roles = await db.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true, groups: true } } } });
  return (
    <div className="card">
      <h1 className="border-b border-gray-200 px-4 py-3 text-lg font-semibold text-sn-dark">Roles</h1>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600"><tr><th className="px-4 py-2">Name</th><th>Description</th><th>Users (direct)</th><th>Groups</th></tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} className="border-t border-gray-100"><td className="px-4 py-2 font-mono">{r.name}</td><td>{r.description}</td><td>{r._count.users}</td><td>{r._count.groups}</td></tr>
          ))}
        </tbody>
      </table>
      <form action={createRoleAction} className="flex gap-2 border-t border-gray-200 p-4">
        <input name="name" placeholder="role_name" className="input w-48" required />
        <input name="description" placeholder="Description" className="input w-96" />
        <button className="btn-primary">Create role</button>
      </form>
    </div>
  );
}
