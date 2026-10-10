import type { Incident } from "@prisma/client";
import { db } from "../db";
import { calcPriority } from "../priority";
import { nextNumber, PREFIX } from "../numbering";
import { auditChanges } from "../audit";
import { processSlas } from "../sla";
import type { SessionUser } from "../roles";

export const INCIDENT_AUDIT_FIELDS = [
  "shortDescription", "state", "impact", "urgency", "priority", "category", "subcategory", "assignmentGroupId",
  "assignedToId", "callerId", "ciId", "problemId", "changeId", "onHoldReason", "resolutionCode", "resolutionNotes", "contactType",
];

export type IncidentInput = Partial<Pick<Incident,
  "shortDescription" | "description" | "callerId" | "category" | "subcategory" | "contactType" | "impact" | "urgency" |
  "state" | "onHoldReason" | "assignmentGroupId" | "assignedToId" | "ciId" | "problemId" | "changeId" |
  "resolutionCode" | "resolutionNotes">>;

export class ValidationError extends Error {}

function validate(next: IncidentInput & { state: string }) {
  if (!next.shortDescription?.trim()) throw new ValidationError("Short description is required");
  if (next.state === "on_hold" && !next.onHoldReason) throw new ValidationError("On hold reason is required when state is On Hold");
  if ((next.state === "resolved" || next.state === "closed") && (!next.resolutionCode || !next.resolutionNotes?.trim())) {
    throw new ValidationError("Resolution code and resolution notes are required to resolve an incident");
  }
}

/** Insert business rules: numbering, priority, SLA attach, audit. */
export async function createIncident(input: IncidentInput & { callerId: string; shortDescription: string }, user: SessionUser) {
  const impact = input.impact ?? 3;
  const urgency = input.urgency ?? 3;
  let state = input.state ?? "new";
  if (state === "new" && input.assignedToId) state = "in_progress";
  const data = { ...input, impact, urgency, state };
  validate(data);
  const now = new Date();
  const inc = await db.incident.create({
    data: {
      ...data,
      number: await nextNumber(PREFIX.incident),
      priority: calcPriority(impact, urgency),
      onHoldReason: state === "on_hold" ? input.onHoldReason : null,
      resolvedAt: state === "resolved" || state === "closed" ? now : null,
      closedAt: state === "closed" ? now : null,
    },
  });
  await auditChanges("incident", inc.id, null, inc, user, INCIDENT_AUDIT_FIELDS);
  await processSlas("incident", inc);
  return inc;
}

/** Update business rules: priority recalculation, state timestamps, reassignment/reopen counts, SLA, audit. */
export async function updateIncident(id: string, input: IncidentInput, user: SessionUser) {
  const before = await db.incident.findUniqueOrThrow({ where: { id } });
  const merged = { ...before, ...input };
  // Assigning a New incident moves it to In Progress (OOB behaviour).
  if (merged.state === "new" && merged.assignedToId && !before.assignedToId && input.state === undefined) merged.state = "in_progress";
  validate(merged);
  const now = new Date();
  const wasResolved = ["resolved", "closed"].includes(before.state);
  const isResolved = ["resolved", "closed"].includes(merged.state);

  const inc = await db.incident.update({
    where: { id },
    data: {
      ...input,
      state: merged.state,
      priority: calcPriority(merged.impact, merged.urgency),
      onHoldReason: merged.state === "on_hold" ? merged.onHoldReason : null,
      resolvedAt: isResolved ? (before.resolvedAt ?? now) : null,
      closedAt: merged.state === "closed" ? (before.closedAt ?? now) : null,
      reassignmentCount: before.reassignmentCount + (input.assignmentGroupId !== undefined && before.assignmentGroupId && input.assignmentGroupId !== before.assignmentGroupId ? 1 : 0),
      reopenCount: before.reopenCount + (wasResolved && !isResolved && merged.state !== "canceled" ? 1 : 0),
    },
  });
  await auditChanges("incident", id, before, inc, user, INCIDENT_AUDIT_FIELDS);
  await processSlas("incident", inc);
  return inc;
}

/** Scheduled job: close incidents resolved more than `days` ago (incident_autoclose). */
export async function autoCloseResolved(days = 7) {
  const cutoff = new Date(Date.now() - days * 86400_000);
  const stale = await db.incident.findMany({ where: { state: "resolved", resolvedAt: { lt: cutoff } } });
  for (const inc of stale) {
    const closed = await db.incident.update({ where: { id: inc.id }, data: { state: "closed", closedAt: new Date() } });
    await auditChanges("incident", inc.id, inc, closed, null, ["state"]);
    await processSlas("incident", closed);
  }
}
