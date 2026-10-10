import { db } from "../db";
import { addJournal } from "../audit";
import type { SessionUser } from "../roles";
import { processSlas } from "../sla";
import { nextNumber, PREFIX } from "../numbering";

/** Records an approver's decision and rolls it up to the parent change or requested item. */
export async function decideApproval(approvalId: string, decision: "approved" | "rejected", comments: string, user: SessionUser) {
  const appr = await db.approval.findUniqueOrThrow({ where: { id: approvalId } });
  if (appr.approverId !== user.id && !user.roles.includes("admin")) throw new Error("You are not the approver for this record");
  if (appr.state !== "requested") throw new Error("This approval has already been decided");
  if (decision === "rejected" && !comments.trim()) throw new Error("Comments are required when rejecting");

  await db.approval.update({ where: { id: approvalId }, data: { state: decision, comments: comments || null, decidedAt: new Date() } });
  await addJournal(appr.table, appr.recordId, "work_notes", `${user.name} ${decision} the request${comments ? `: ${comments}` : ""}`, user.id);

  const all = await db.approval.findMany({ where: { table: appr.table, recordId: appr.recordId, state: { not: "cancelled" } } });
  const rejected = all.some((a) => a.state === "rejected");
  const approved = !rejected && all.every((a) => a.state === "approved");
  if (!rejected && !approved) return;

  if (appr.table === "change_request") {
    if (rejected) await db.approval.updateMany({ where: { table: appr.table, recordId: appr.recordId, state: "requested" }, data: { state: "cancelled" } });
    await db.changeRequest.update({
      where: { id: appr.recordId },
      data: rejected ? { approval: "rejected", state: "new" } : { approval: "approved", state: "scheduled" },
    });
  }

  if (appr.table === "sc_req_item") {
    const ritm = await db.requestItem.findUniqueOrThrow({ where: { id: appr.recordId }, include: { item: true } });
    if (rejected) {
      const r = await db.requestItem.update({
        where: { id: ritm.id }, data: { approval: "rejected", stage: "rejected", state: "closed_incomplete", closedAt: new Date() },
      });
      await processSlas("sc_req_item", r);
    } else {
      await startFulfilment(ritm.id);
    }
    await rollupRequest(ritm.requestId);
  }
}

/** Moves a requested item into fulfilment and creates catalog tasks from the item's templates. */
export async function startFulfilment(ritmId: string) {
  const ritm = await db.requestItem.findUniqueOrThrow({ where: { id: ritmId }, include: { item: true } });
  const r = await db.requestItem.update({
    where: { id: ritmId }, data: { approval: ritm.item.requiresApproval ? "approved" : "not_requested", stage: "fulfillment", state: "work_in_progress" },
  });
  let templates: string[] = [];
  try { templates = JSON.parse(ritm.item.taskTemplates); } catch { /* none */ }
  if (!templates.length) templates = [`Fulfil ${ritm.item.name}`];
  for (const sd of templates) {
    await db.catalogTask.create({
      data: { number: await nextNumber(PREFIX.sc_task), ritmId, shortDescription: sd, assignmentGroupId: ritm.item.fulfillmentGroupId },
    });
  }
  await processSlas("sc_req_item", r);
}

/** Request state/approval follows its items. */
export async function rollupRequest(requestId: string) {
  const items = await db.requestItem.findMany({ where: { requestId } });
  const open = items.some((i) => ["open", "work_in_progress"].includes(i.state));
  const approval = items.some((i) => i.approval === "requested") ? "requested" : items.some((i) => i.approval === "rejected") ? "rejected" : "approved";
  const state = open ? "open" : items.every((i) => i.state === "closed_complete") ? "closed_complete" : "closed_incomplete";
  await db.request.update({ where: { id: requestId }, data: { state, approval, closedAt: open ? null : new Date() } });
}
