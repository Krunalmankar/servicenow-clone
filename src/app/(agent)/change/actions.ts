"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { addJournal } from "@/lib/audit";
import { num, optDate, optStr, str } from "@/lib/list";
import { createChange, updateChange, type ChangeInput } from "@/lib/rules/change";

function readForm(fd: FormData): ChangeInput {
  return {
    shortDescription: str(fd, "shortDescription"),
    description: optStr(fd, "description"),
    type: str(fd, "type") || "normal",
    category: str(fd, "category") || "software",
    state: str(fd, "state") || "new",
    risk: str(fd, "risk") || "moderate",
    impact: num(fd, "impact", 3),
    priority: num(fd, "priority", 4),
    assignmentGroupId: optStr(fd, "assignmentGroupId"),
    assignedToId: optStr(fd, "assignedToId"),
    ciId: optStr(fd, "ciId"),
    justification: optStr(fd, "justification"),
    implementationPlan: optStr(fd, "implementationPlan"),
    backoutPlan: optStr(fd, "backoutPlan"),
    testPlan: optStr(fd, "testPlan"),
    riskImpactAnalysis: optStr(fd, "riskImpactAnalysis"),
    plannedStart: optDate(fd, "plannedStart"),
    plannedEnd: optDate(fd, "plannedEnd"),
    closeCode: optStr(fd, "closeCode"),
    closeNotes: optStr(fd, "closeNotes"),
  };
}

export async function createChangeAction(fd: FormData) {
  const user = await requireRole("itil");
  const c = await attempt("/change/new", () => createChange(readForm(fd), user));
  redirect(`/change/${c.id}`);
}

export async function updateChangeAction(fd: FormData) {
  return saveChange(fd, null);
}

/** UI action buttons (Request Approval, Implement, Close…) save the form and move to a state. */
export async function transitionChangeAction(to: string, fd: FormData) {
  return saveChange(fd, to);
}

async function saveChange(fd: FormData, transition: string | null) {
  const user = await requireRole("itil");
  const id = str(fd, "id");
  const input = readForm(fd);
  if (transition) input.state = transition;
  await attempt(`/change/${id}`, () => updateChange(id, input, user));
  await addJournal("change_request", id, "work_notes", str(fd, "workNotes"), user.id);
  revalidatePath(`/change/${id}`);
  redirect(`/change/${id}`);
}
