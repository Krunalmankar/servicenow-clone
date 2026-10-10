"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { auditChanges } from "@/lib/audit";
import { optStr, str } from "@/lib/list";
import { db } from "@/lib/db";

const FIELDS = ["name", "ciClass", "status", "environment", "criticality", "ipAddress", "os", "supportGroupId", "ownedById", "location"];

export async function saveCiAction(fd: FormData) {
  const user = await requireRole("cmdb_admin", "itil");
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name"), ciClass: str(fd, "ciClass"), status: str(fd, "status") || "operational",
    environment: str(fd, "environment") || "production", criticality: str(fd, "criticality") || "3",
    ipAddress: optStr(fd, "ipAddress"), fqdn: optStr(fd, "fqdn"), os: optStr(fd, "os"), version: optStr(fd, "version"),
    serialNumber: optStr(fd, "serialNumber"), manufacturer: optStr(fd, "manufacturer"), location: optStr(fd, "location"),
    description: optStr(fd, "description"), ownedById: optStr(fd, "ownedById"), supportGroupId: optStr(fd, "supportGroupId"),
  };
  const saved = await attempt(id ? `/cmdb/${id}` : "/cmdb/new", async () => {
    if (!data.name) throw new Error("Name is required");
    const dup = await db.configurationItem.findFirst({ where: { name: data.name, id: id ? { not: id } : undefined } });
    if (dup) throw new Error(`A CI named ${data.name} already exists`);
    const before = id ? await db.configurationItem.findUnique({ where: { id } }) : null;
    const ci = id ? await db.configurationItem.update({ where: { id }, data }) : await db.configurationItem.create({ data });
    await auditChanges("cmdb_ci", ci.id, before, ci, user, FIELDS);
    return ci;
  });
  revalidatePath("/cmdb");
  redirect(`/cmdb/${saved.id}`);
}

export async function addRelAction(fd: FormData) {
  await requireRole("cmdb_admin", "itil");
  const id = str(fd, "id");
  const other = str(fd, "otherId");
  const type = str(fd, "type");
  const direction = str(fd, "direction");
  await attempt(`/cmdb/${id}`, async () => {
    if (!other || other === id) throw new Error("Pick a different CI");
    const [parentId, childId] = direction === "child" ? [id, other] : [other, id];
    await db.ciRelationship.upsert({ where: { parentId_childId_type: { parentId, childId, type } }, create: { parentId, childId, type }, update: {} });
  });
  revalidatePath(`/cmdb/${id}`);
}

export async function removeRelAction(fd: FormData) {
  await requireRole("cmdb_admin", "itil");
  await db.ciRelationship.delete({ where: { id: str(fd, "relId") } });
  revalidatePath(`/cmdb/${str(fd, "id")}`);
}
