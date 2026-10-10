import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { userOptions } from "@/lib/refs";
import { Field, FormHeader, Grid, ReadOnly, RefField, Section, TextField } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { CheckList } from "@/components/CheckList";
import { saveUserAction } from "../../actions";

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const { error } = await searchParams;
  const u = id === "new" ? null : await db.user.findUnique({
    where: { id },
    include: { roles: true, memberships: { include: { group: { include: { roles: { include: { role: true } } } } } } },
  });
  if (id !== "new" && !u) notFound();
  const [roles, groups, users] = await Promise.all([db.role.findMany({ orderBy: { name: "asc" } }), db.group.findMany({ orderBy: { name: "asc" } }), userOptions()]);
  const inherited = u ? [...new Set(u.memberships.flatMap((m) => m.group.roles.map((r) => `${r.role.name} (from ${m.group.name})`)))] : [];
  return (
    <form action={saveUserAction} className="card">
      <input type="hidden" name="id" value={u?.id ?? ""} />
      <FormHeader title="User" number={u ? `${u.firstName} ${u.lastName}` : undefined}><button className="btn-primary">Save</button></FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <Grid>
        <TextField label="User ID" name="userName" defaultValue={u?.userName} required />
        <TextField label="Email" name="email" type="email" defaultValue={u?.email} required />
        <TextField label="First name" name="firstName" defaultValue={u?.firstName} required />
        <TextField label="Last name" name="lastName" defaultValue={u?.lastName} required />
        <TextField label="Title" name="title" defaultValue={u?.title ?? ""} />
        <TextField label="Department" name="department" defaultValue={u?.department ?? ""} />
        <TextField label="Phone" name="phone" defaultValue={u?.phone ?? ""} />
        <TextField label="Location" name="location" defaultValue={u?.location ?? ""} />
        <RefField label="Manager" name="managerId" options={users.filter((x) => x.id !== u?.id)} value={u?.managerId} />
        <Field label="Active"><input type="checkbox" name="active" defaultChecked={u?.active ?? true} className="mt-2 h-4 w-4" /></Field>
        <TextField label={u ? "Reset password" : "Password"} name="password" type="password" placeholder={u ? "Leave blank to keep" : "Min 8 characters"} required={!u} />
      </Grid>
      <Section title="Roles and groups">
        <Grid>
          <Field label="Direct roles"><CheckList name="roles" options={roles.map((r) => ({ id: r.id, label: r.name, hint: r.description ?? "" }))} selected={u?.roles.map((r) => r.roleId) ?? []} /></Field>
          <Field label="Groups"><CheckList name="groups" options={groups.map((g) => ({ id: g.id, label: g.name }))} selected={u?.memberships.map((m) => m.groupId) ?? []} /></Field>
          {u && <ReadOnly label="Inherited roles" value={inherited.join(", ") || "None"} full />}
        </Grid>
      </Section>
    </form>
  );
}
