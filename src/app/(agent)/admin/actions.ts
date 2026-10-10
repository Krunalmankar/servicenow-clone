"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { auditChanges } from "@/lib/audit";
import { optStr, str } from "@/lib/list";
import { db } from "@/lib/db";

export async function saveUserAction(fd: FormData) {
  const admin = await requireRole("admin");
  const id = str(fd, "id");
  const saved = await attempt(id ? `/admin/users/${id}` : "/admin/users/new", async () => {
    const data = {
      userName: str(fd, "userName"), firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), email: str(fd, "email"),
      title: optStr(fd, "title"), department: optStr(fd, "department"), phone: optStr(fd, "phone"), location: optStr(fd, "location"),
      managerId: optStr(fd, "managerId"), active: fd.get("active") === "on",
    };
    if (!data.userName || !data.firstName || !data.lastName || !data.email) throw new Error("User name, first name, last name and email are required");
    if (id && data.managerId === id) throw new Error("A user cannot be their own manager");
    const password = str(fd, "password");
    if (!id && password.length < 8) throw new Error("Password must be at least 8 characters");
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const before = id ? await db.user.findUnique({ where: { id } }) : null;
    const u = id
      ? await db.user.update({ where: { id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } })
      : await db.user.create({ data: { ...data, passwordHash: passwordHash! } });
    const roleIds = fd.getAll("roles").map(String);
    await db.userRole.deleteMany({ where: { userId: u.id } });
    if (roleIds.length) await db.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: u.id, roleId })) });
    const groupIds = fd.getAll("groups").map(String);
    await db.groupMember.deleteMany({ where: { userId: u.id } });
    if (groupIds.length) await db.groupMember.createMany({ data: groupIds.map((groupId) => ({ userId: u.id, groupId })) });
    await auditChanges("sys_user", u.id, before, u, admin, ["userName", "email", "active", "managerId", "title", "department"]);
    return u;
  });
  revalidatePath("/admin/users");
  redirect(`/admin/users/${saved.id}`);
}

export async function saveGroupAction(fd: FormData) {
  await requireRole("admin");
  const id = str(fd, "id");
  const saved = await attempt(id ? `/admin/groups/${id}` : "/admin/groups/new", async () => {
    const data = { name: str(fd, "name"), description: optStr(fd, "description"), email: optStr(fd, "email"), managerId: optStr(fd, "managerId"), active: fd.get("active") === "on" };
    if (!data.name) throw new Error("Name is required");
    const g = id ? await db.group.update({ where: { id }, data }) : await db.group.create({ data });
    const members = fd.getAll("members").map(String);
    await db.groupMember.deleteMany({ where: { groupId: g.id } });
    if (members.length) await db.groupMember.createMany({ data: members.map((userId) => ({ userId, groupId: g.id })) });
    const roleIds = fd.getAll("roles").map(String);
    await db.groupRole.deleteMany({ where: { groupId: g.id } });
    if (roleIds.length) await db.groupRole.createMany({ data: roleIds.map((roleId) => ({ groupId: g.id, roleId })) });
    return g;
  });
  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${saved.id}`);
}

export async function createRoleAction(fd: FormData) {
  await requireRole("admin");
  const name = str(fd, "name").toLowerCase().replace(/\s+/g, "_");
  await attempt("/admin/roles", async () => {
    if (!name) throw new Error("Role name is required");
    if (await db.role.findUnique({ where: { name } })) throw new Error(`Role ${name} already exists`);
    await db.role.create({ data: { name, description: optStr(fd, "description") } });
  });
  revalidatePath("/admin/roles");
}
