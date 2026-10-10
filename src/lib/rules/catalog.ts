import { db } from "../db";
import { nextNumber, PREFIX } from "../numbering";
import { addJournal, auditChanges } from "../audit";
import { processSlas } from "../sla";
import { rollupRequest, startFulfilment } from "./approval";
import type { SessionUser } from "../roles";

export type CatalogVariable = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date";
  required?: boolean;
  options?: string[];
};

export function parseVariables(json: string): CatalogVariable[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Orders a catalog item: creates REQ + RITM, then routes to manager approval or straight to fulfilment. */
export async function orderItem(
  itemId: string, values: Record<string, string>, quantity: number, requestedForId: string, user: SessionUser, instructions?: string,
) {
  const item = await db.catalogItem.findUniqueOrThrow({ where: { id: itemId } });
  if (!item.active) throw new Error("This item is no longer available");
  for (const v of parseVariables(item.variables)) {
    if (v.required && v.type !== "checkbox" && !values[v.name]?.trim()) throw new Error(`${v.label} is required`);
  }
  const requestedFor = await db.user.findUniqueOrThrow({ where: { id: requestedForId } });
  const due = new Date(Date.now() + item.deliveryDays * 86400_000);

  const req = await db.request.create({
    data: {
      number: await nextNumber(PREFIX.sc_request), requestedForId, requestedById: user.id, dueDate: due,
      specialInstructions: instructions || null, approval: item.requiresApproval ? "requested" : "approved",
    },
  });
  const ritm = await db.requestItem.create({
    data: {
      number: await nextNumber(PREFIX.sc_req_item), requestId: req.id, itemId, quantity: Math.max(1, quantity),
      variables: JSON.stringify(values), assignmentGroupId: item.fulfillmentGroupId,
      approval: item.requiresApproval ? "requested" : "not_requested",
      stage: item.requiresApproval ? "waiting_for_approval" : "fulfillment",
    },
  });
  await processSlas("sc_req_item", ritm);

  if (item.requiresApproval) {
    // Approval goes to the requested-for user's manager; fall back to catalog approvers.
    let approverIds = requestedFor.managerId ? [requestedFor.managerId] : [];
    if (!approverIds.length) {
      const approvers = await db.user.findMany({ where: { active: true, roles: { some: { role: { name: "approver_user" } } } }, take: 1 });
      approverIds = approvers.map((a) => a.id);
    }
    if (approverIds.length) {
      for (const id of approverIds) await db.approval.create({ data: { table: "sc_req_item", recordId: ritm.id, approverId: id } });
    } else {
      await startFulfilment(ritm.id);
    }
  } else {
    await startFulfilment(ritm.id);
  }
  await rollupRequest(req.id);
  return { req, ritm };
}

/** Closing the last open catalog task completes the requested item. */
export async function updateCatalogTask(id: string, data: { state?: string; assignedToId?: string | null; assignmentGroupId?: string | null; workNotes?: string }, user: SessionUser) {
  const before = await db.catalogTask.findUniqueOrThrow({ where: { id } });
  const closing = data.state && data.state.startsWith("closed") && !before.state.startsWith("closed");
  const t = await db.catalogTask.update({
    where: { id },
    data: {
      state: data.state, assignedToId: data.assignedToId, assignmentGroupId: data.assignmentGroupId,
      closedAt: closing ? new Date() : data.state && !data.state.startsWith("closed") ? null : undefined,
    },
  });
  await auditChanges("sc_task", id, before, t, user, ["state", "assignedToId", "assignmentGroupId"]);
  if (data.workNotes) await addJournal("sc_task", id, "work_notes", data.workNotes, user.id);

  if (closing) {
    const siblings = await db.catalogTask.findMany({ where: { ritmId: t.ritmId } });
    if (siblings.every((s) => s.state.startsWith("closed"))) {
      const allOk = siblings.every((s) => s.state === "closed_complete");
      const ritm = await db.requestItem.update({
        where: { id: t.ritmId },
        data: { state: allOk ? "closed_complete" : "closed_incomplete", stage: allOk ? "delivered" : "rejected", closedAt: new Date() },
      });
      await addJournal("sc_req_item", ritm.id, "comments", allOk ? "Your request has been fulfilled." : "Your request could not be completed.", user.id);
      await processSlas("sc_req_item", ritm);
      await rollupRequest(ritm.requestId);
    }
  }
  return t;
}
