"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createIncident, updateIncident, type IncidentInput } from "@/lib/rules/incident";
import { attempt } from "@/lib/form-errors";
import { addJournal } from "@/lib/audit";
import { num, optStr, str } from "@/lib/list";
import { db } from "@/lib/db";
import { nextNumber, PREFIX } from "@/lib/numbering";
import { processSlas } from "@/lib/sla";

function readForm(fd: FormData): IncidentInput {
  return {
    shortDescription: str(fd, "shortDescription"),
    description: optStr(fd, "description"),
    callerId: str(fd, "callerId"),
    category: str(fd, "category") || "inquiry",
    subcategory: optStr(fd, "subcategory"),
    contactType: str(fd, "contactType") || "phone",
    impact: num(fd, "impact", 3),
    urgency: num(fd, "urgency", 3),
    state: str(fd, "state") || "new",
    onHoldReason: optStr(fd, "onHoldReason"),
    assignmentGroupId: optStr(fd, "assignmentGroupId"),
    assignedToId: optStr(fd, "assignedToId"),
    ciId: optStr(fd, "ciId"),
    problemId: optStr(fd, "problemId"),
    changeId: optStr(fd, "changeId"),
    resolutionCode: optStr(fd, "resolutionCode"),
    resolutionNotes: optStr(fd, "resolutionNotes"),
  };
}

export async function createIncidentAction(fd: FormData) {
  const user = await requireRole("itil");
  const input = readForm(fd);
  const inc = await attempt("/incident/new", () =>
    createIncident({ ...input, callerId: input.callerId || user.id, shortDescription: input.shortDescription ?? "" }, user));
  await addJournal("incident", inc.id, "work_notes", str(fd, "workNotes"), user.id);
  redirect(`/incident/${inc.id}`);
}

export async function updateIncidentAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  const path = `/incident/${id}`;
  await attempt(path, () => updateIncident(id, readForm(fd), user));
  await addJournal("incident", id, "work_notes", str(fd, "workNotes"), user.id);
  await addJournal("incident", id, "comments", str(fd, "comments"), user.id);
  revalidatePath(path);
  redirect(path);
}

export async function assignToMeAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  await attempt(`/incident/${id}`, () => updateIncident(id, { assignedToId: user.id }, user));
  revalidatePath(`/incident/${id}`);
}

/** "Create Problem" UI action: new problem from incident, linked back. */
export async function createProblemFromIncident(fd: FormData) {
  const user = await requireRole("itil");
  const inc = await db.incident.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  const prb = await db.problem.create({
    data: {
      number: await nextNumber(PREFIX.problem),
      shortDescription: inc.shortDescription, description: inc.description,
      impact: inc.impact, urgency: inc.urgency, priority: inc.priority,
      category: inc.category === "inquiry" ? "software" : inc.category,
      assignmentGroupId: inc.assignmentGroupId, ciId: inc.ciId,
    },
  });
  await updateIncident(inc.id, { problemId: prb.id }, user);
  await addJournal("problem", prb.id, "work_notes", `Created from ${inc.number}`, user.id);
  await processSlas("problem", prb);
  redirect(`/problem/${prb.id}`);
}
