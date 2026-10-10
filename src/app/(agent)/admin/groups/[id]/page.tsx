import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { userOptions } from "@/lib/refs";
import { Field, FormHeader, Grid, RefField, Section, TextArea, TextField } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { CheckList } from "@/components/CheckList";
import { saveGroupAction } from "../../actions";

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const { error } = await searchParams;
  const g = id === "new" ? null : await db.group.findUnique({ where: { id }, include: { members: true, roles: true } });
  if (id !== "new" && !g) notFound();
  const [roles, users] = await Promise.all([db.role.findMany({ orderBy: { name: "asc" } }), userOptions()]);
  return (
    <form action={saveGroupAction} className="card">
      <input type="hidden" name="id" value={g?.id ?? ""} />
      <FormHeader title="Group" number={g?.name}><button className="btn-primary">Save</button></FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <Grid>
        <TextField label="Name" name="name" defaultValue={g?.name} required />
        <RefField label="Manager" name="managerId" options={users} value={g?.managerId} />
        <TextField label="Group email" name="email" defaultValue={g?.email ?? ""} />
        <Field label="Active"><input type="checkbox" name="active" defaultChecked={g?.active ?? true} className="mt-2 h-4 w-4" /></Field>
        <TextArea label="Description" name="description" rows={2} defaultValue={g?.description ?? ""} />
      </Grid>
      <Section title="Members and roles">
        <Grid>
          <Field label="Members"><CheckList name="members" options={users} selected={g?.members.map((m) => m.userId) ?? []} /></Field>
          <Field label="Roles (granted to all members)"><CheckList name="roles" options={roles.map((r) => ({ id: r.id, label: r.name, hint: r.description ?? "" }))} selected={g?.roles.map((r) => r.roleId) ?? []} /></Field>
        </Grid>
      </Section>
    </form>
  );
}
