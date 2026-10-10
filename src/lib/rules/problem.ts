import type { Problem } from "@prisma/client";
import { db } from "../db";
import { calcPriority } from "../priority";
import { nextNumber, PREFIX } from "../numbering";
import { auditChanges, addJournal } from "../audit";
import { processSlas } from "../sla";
import type { SessionUser } from "../roles";

const FIELDS = ["shortDescription", "state", "impact", "urgency", "priority", "category", "assignmentGroupId", "assignedToId", "ciId", "knownError", "rootCause", "workaround", "fix", "resolutionCode"];

export type ProblemInput = Partial<Pick<Problem,
  "shortDescription" | "description" | "category" | "impact" | "urgency" | "state" | "assignmentGroupId" | "assignedToId" |
  "ciId" | "rootCause" | "workaround" | "fix" | "knownError" | "resolutionCode">>;

function validate(p: ProblemInput) {
  if (!p.shortDescription?.trim()) throw new Error("Short description is required");
  if (p.state === "fix_in_progress" && !p.rootCause?.trim()) throw new Error("Root cause is required before moving to Fix in Progress");
  if ((p.state === "resolved" || p.state === "closed") && !p.resolutionCode) throw new Error("Resolution code is required to resolve a problem");
}

export async function createProblem(input: ProblemInput, user: SessionUser) {
  validate({ state: "new", ...input });
  const impact = input.impact ?? 3, urgency = input.urgency ?? 3;
  const p = await db.problem.create({
    data: { ...input, shortDescription: input.shortDescription!, impact, urgency, priority: calcPriority(impact, urgency), number: await nextNumber(PREFIX.problem) },
  });
  await auditChanges("problem", p.id, null, p, user, FIELDS);
  await processSlas("problem", p);
  return p;
}

export async function updateProblem(id: string, input: ProblemInput, user: SessionUser) {
  const before = await db.problem.findUniqueOrThrow({ where: { id } });
  const merged = { ...before, ...input };
  validate(merged);
  const now = new Date();
  const resolved = ["resolved", "closed"].includes(merged.state);
  const p = await db.problem.update({
    where: { id },
    data: {
      ...input,
      priority: calcPriority(merged.impact, merged.urgency),
      knownError: merged.knownError || (!!merged.workaround?.trim() && merged.state !== "new"),
      resolvedAt: resolved ? (before.resolvedAt ?? now) : null,
      closedAt: merged.state === "closed" ? (before.closedAt ?? now) : null,
    },
  });
  await auditChanges("problem", id, before, p, user, FIELDS);
  await processSlas("problem", p);

  // When a problem is resolved with a fix, notify linked open incidents (OOB "resolve related incidents" behaviour).
  if (p.state === "resolved" && before.state !== "resolved") {
    const incidents = await db.incident.findMany({ where: { problemId: id, state: { in: ["new", "in_progress", "on_hold"] } } });
    for (const inc of incidents) {
      await addJournal("incident", inc.id, "work_notes", `Related problem ${p.number} resolved: ${p.fix ?? p.resolutionCode}`, user.id);
    }
  }
  return p;
}
