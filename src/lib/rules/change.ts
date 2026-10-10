import type { ChangeRequest } from "@prisma/client";
import { db } from "../db";
import { nextNumber, PREFIX } from "../numbering";
import { auditChanges, addJournal } from "../audit";
import type { SessionUser } from "../roles";

const FIELDS = ["shortDescription", "type", "state", "risk", "impact", "priority", "approval", "assignmentGroupId", "assignedToId", "ciId", "plannedStart", "plannedEnd", "closeCode"];

export type ChangeInput = Partial<Pick<ChangeRequest,
  "shortDescription" | "description" | "type" | "category" | "state" | "risk" | "impact" | "priority" | "assignmentGroupId" | "assignedToId" |
  "ciId" | "justification" | "implementationPlan" | "backoutPlan" | "testPlan" | "riskImpactAnalysis" | "plannedStart" | "plannedEnd" |
  "actualStart" | "actualEnd" | "closeCode" | "closeNotes">>;

const ORDER = ["new", "assess", "authorize", "scheduled", "implement", "review", "closed"];

function validate(c: ChangeInput & { approval: string; type: string; state: string }) {
  if (!c.shortDescription?.trim()) throw new Error("Short description is required");
  if (c.plannedStart && c.plannedEnd && c.plannedStart >= c.plannedEnd) throw new Error("Planned end must be after planned start");
  const idx = ORDER.indexOf(c.state);
  if (idx >= ORDER.indexOf("authorize") && c.state !== "canceled") {
    if (!c.plannedStart || !c.plannedEnd) throw new Error("Planned start and end dates are required before authorization");
    if (c.type !== "standard" && (!c.implementationPlan?.trim() || !c.backoutPlan?.trim())) {
      throw new Error("Implementation and backout plans are required before authorization");
    }
  }
  if (idx >= ORDER.indexOf("scheduled") && c.type !== "standard" && c.approval !== "approved") {
    throw new Error("The change must be approved before it can be scheduled or implemented");
  }
  if (c.state === "closed" && (!c.closeCode || !c.closeNotes?.trim())) throw new Error("Close code and close notes are required to close a change");
}

export async function createChange(input: ChangeInput, user: SessionUser) {
  const type = input.type ?? "normal";
  // Standard changes are pre-approved from a template.
  const approval = type === "standard" ? "approved" : "not_requested";
  validate({ state: "new", ...input, type, approval });
  const c = await db.changeRequest.create({
    data: { ...input, shortDescription: input.shortDescription!, type, approval, requestedById: user.id, number: await nextNumber(PREFIX.change_request) },
  });
  await auditChanges("change_request", c.id, null, c, user, FIELDS);
  return c;
}

export async function updateChange(id: string, input: ChangeInput, user: SessionUser) {
  const before = await db.changeRequest.findUniqueOrThrow({ where: { id } });
  const merged = { ...before, ...input };
  // Moving into Authorize requests approval automatically.
  const requestApproval = merged.state === "authorize" && before.state !== "authorize" && merged.type !== "standard" && before.approval !== "approved";
  if (requestApproval) merged.approval = "requested";
  validate(merged);
  const now = new Date();
  const c = await db.changeRequest.update({
    where: { id },
    data: {
      ...input,
      approval: merged.approval,
      actualStart: merged.state === "implement" && !before.actualStart ? now : merged.actualStart,
      actualEnd: ["review", "closed"].includes(merged.state) && before.state === "implement" && !before.actualEnd ? now : merged.actualEnd,
      closedAt: ["closed", "canceled"].includes(merged.state) ? (before.closedAt ?? now) : null,
    },
  });
  if (requestApproval) await createChangeApprovals(c, user);
  await auditChanges("change_request", id, before, c, user, FIELDS);
  return c;
}

/** Requests approval from every user holding change_manager (the CAB). */
export async function createChangeApprovals(c: ChangeRequest, user: SessionUser) {
  await db.approval.updateMany({ where: { table: "change_request", recordId: c.id, state: "requested" }, data: { state: "cancelled" } });
  const approvers = await db.user.findMany({
    where: { active: true, OR: [{ roles: { some: { role: { name: "change_manager" } } } }, { memberships: { some: { group: { name: "CAB Approval" } } } }] },
  });
  for (const a of approvers) await db.approval.create({ data: { table: "change_request", recordId: c.id, approverId: a.id } });
  await addJournal("change_request", c.id, "work_notes", `Approval requested from ${approvers.map((a) => `${a.firstName} ${a.lastName}`).join(", ") || "nobody (no change managers found)"}`, user.id);
}

/** Changes whose planned window overlaps this one on the same CI. */
export async function findConflicts(c: Pick<ChangeRequest, "id" | "ciId" | "plannedStart" | "plannedEnd">) {
  if (!c.ciId || !c.plannedStart || !c.plannedEnd) return [];
  return db.changeRequest.findMany({
    where: {
      id: { not: c.id }, ciId: c.ciId, state: { notIn: ["closed", "canceled"] },
      plannedStart: { lt: c.plannedEnd }, plannedEnd: { gt: c.plannedStart },
    },
  });
}
