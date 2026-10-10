"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { addJournal, auditChanges } from "@/lib/audit";
import { optStr, str } from "@/lib/list";
import { db } from "@/lib/db";
import { processSlas } from "@/lib/sla";
import { updateCatalogTask } from "@/lib/rules/catalog";
import { rollupRequest } from "@/lib/rules/approval";
import { nextNumber, PREFIX } from "@/lib/numbering";

export async function updateRitmAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  await attempt(`/sc/ritm/${id}`, async () => {
    const before = await db.requestItem.findUniqueOrThrow({ where: { id } });
    const state = str(fd, "state") || before.state;
    const closing = state.startsWith("closed") && !before.state.startsWith("closed");
    const r = await db.requestItem.update({
      where: { id },
      data: {
        state, assignmentGroupId: optStr(fd, "assignmentGroupId"), assignedToId: optStr(fd, "assignedToId"),
        closedAt: closing ? new Date() : state.startsWith("closed") ? before.closedAt : null,
        stage: closing ? (state === "closed_complete" ? "delivered" : "rejected") : before.stage,
      },
    });
    await auditChanges("sc_req_item", id, before, r, user, ["state", "stage", "assignmentGroupId", "assignedToId"]);
    await processSlas("sc_req_item", r);
    await rollupRequest(r.requestId);
  });
  await addJournal("sc_req_item", id, "work_notes", str(fd, "workNotes"), user.id);
  revalidatePath(`/sc/ritm/${id}`);
  redirect(`/sc/ritm/${id}`);
}

export async function addTaskAction(fd: FormData) {
  const user = await requireRole("itil");
  const ritmId = str(fd, "ritmId");
  const ritm = await db.requestItem.findUniqueOrThrow({ where: { id: ritmId } });
  await db.catalogTask.create({
    data: { number: await nextNumber(PREFIX.sc_task), ritmId, shortDescription: str(fd, "shortDescription") || "Fulfilment task", assignmentGroupId: ritm.assignmentGroupId },
  });
  await addJournal("sc_req_item", ritmId, "work_notes", `Task added: ${str(fd, "shortDescription")}`, user.id);
  revalidatePath(`/sc/ritm/${ritmId}`);
}

export async function updateTaskAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  await attempt(`/sc/task/${id}`, () => updateCatalogTask(id, {
    state: str(fd, "state"), assignedToId: optStr(fd, "assignedToId"), assignmentGroupId: optStr(fd, "assignmentGroupId"), workNotes: str(fd, "workNotes"),
  }, user));
  revalidatePath(`/sc/task/${id}`);
  redirect(`/sc/task/${id}`);
}

export async function saveItemAction(fd: FormData) {
  await requireRole("catalog_admin");
  const id = str(fd, "id");
  const back = id ? `/sc/item/${id}` : "/sc/item/new";
  const saved = await attempt(back, async () => {
    const variables = str(fd, "variables") || "[]";
    const taskTemplates = str(fd, "taskTemplates").split("\n").map((s) => s.trim()).filter(Boolean);
    const parsed = JSON.parse(variables);
    if (!Array.isArray(parsed)) throw new Error("Variables must be a JSON array");
    const data = {
      name: str(fd, "name"), shortDescription: str(fd, "shortDescription"), description: optStr(fd, "description"),
      categoryId: str(fd, "categoryId"), price: parseFloat(str(fd, "price")) || 0, deliveryDays: parseInt(str(fd, "deliveryDays")) || 3,
      requiresApproval: fd.get("requiresApproval") === "on", active: fd.get("active") === "on",
      fulfillmentGroupId: optStr(fd, "fulfillmentGroupId"), variables: JSON.stringify(parsed), taskTemplates: JSON.stringify(taskTemplates),
    };
    if (!data.name || !data.categoryId) throw new Error("Name and category are required");
    return id ? db.catalogItem.update({ where: { id }, data }) : db.catalogItem.create({ data });
  });
  revalidatePath("/sc/item");
  redirect(`/sc/item/${saved.id}`);
}

export async function saveCategoryAction(fd: FormData) {
  await requireRole("catalog_admin");
  const name = str(fd, "name");
  if (name) {
    await db.catalogCategory.create({ data: { name, description: optStr(fd, "description"), icon: optStr(fd, "icon"), order: parseInt(str(fd, "order")) || 100 } });
  }
  revalidatePath("/sc/category");
}
