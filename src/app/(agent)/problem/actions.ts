"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { addJournal } from "@/lib/audit";
import { num, optStr, str } from "@/lib/list";
import { db } from "@/lib/db";
import { createProblem, updateProblem, type ProblemInput } from "@/lib/rules/problem";
import { updateIncident } from "@/lib/rules/incident";

function readForm(fd: FormData): ProblemInput {
  return {
    shortDescription: str(fd, "shortDescription"),
    description: optStr(fd, "description"),
    category: str(fd, "category") || "software",
    impact: num(fd, "impact", 3),
    urgency: num(fd, "urgency", 3),
    state: str(fd, "state") || "new",
    assignmentGroupId: optStr(fd, "assignmentGroupId"),
    assignedToId: optStr(fd, "assignedToId"),
    ciId: optStr(fd, "ciId"),
    rootCause: optStr(fd, "rootCause"),
    workaround: optStr(fd, "workaround"),
    fix: optStr(fd, "fix"),
    knownError: fd.get("knownError") === "on",
    resolutionCode: optStr(fd, "resolutionCode"),
  };
}

export async function createProblemAction(fd: FormData) {
  const user = await requireRole("itil");
  const p = await attempt("/problem/new", () => createProblem(readForm(fd), user));
  redirect(`/problem/${p.id}`);
}

export async function updateProblemAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  await attempt(`/problem/${id}`, () => updateProblem(id, readForm(fd), user));
  await addJournal("problem", id, "work_notes", str(fd, "workNotes"), user.id);
  revalidatePath(`/problem/${id}`);
  redirect(`/problem/${id}`);
}

export async function linkIncidentAction(fd: FormData) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  const number = str(fd, "incidentNumber").toUpperCase();
  const inc = await db.incident.findUnique({ where: { number } });
  await attempt(`/problem/${id}`, async () => {
    if (!inc) throw new Error(`Incident ${number} not found`);
    await updateIncident(inc.id, { problemId: id }, user);
  });
  revalidatePath(`/problem/${id}`);
}
