"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { str } from "@/lib/list";
import { db } from "@/lib/db";

export async function saveSlaAction(fd: FormData) {
  await requireRole("admin");
  const id = str(fd, "id");
  const saved = await attempt(id ? `/sla/${id}` : "/sla/new", async () => {
    const priorities = fd.getAll("priority").map(String);
    const condition = JSON.stringify(priorities.length ? { priority: priorities } : {});
    const data = {
      name: str(fd, "name"), table: str(fd, "table"), type: str(fd, "type"), condition,
      durationMinutes: Math.round((parseFloat(str(fd, "hours")) || 0) * 60), pauseStates: str(fd, "pauseStates"), active: fd.get("active") === "on",
    };
    if (!data.name || data.durationMinutes <= 0) throw new Error("Name and a positive duration are required");
    return id ? db.slaDefinition.update({ where: { id }, data }) : db.slaDefinition.create({ data });
  });
  revalidatePath("/sla");
  redirect(`/sla/${saved.id}`);
}
