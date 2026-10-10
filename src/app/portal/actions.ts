"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, isAgent } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { addJournal } from "@/lib/audit";
import { num, optStr, str } from "@/lib/list";
import { createIncident, updateIncident } from "@/lib/rules/incident";
import { orderItem, parseVariables } from "@/lib/rules/catalog";

export async function reportIssueAction(fd: FormData) {
  const user = await requireUser();
  const urgency = num(fd, "urgency", 3);
  const serviceDesk = await db.group.findUnique({ where: { name: "Service Desk" } });
  const inc = await attempt("/portal/issue", () => createIncident({
    shortDescription: str(fd, "shortDescription"), description: optStr(fd, "description"), callerId: user.id,
    urgency, impact: 3, category: str(fd, "category") || "inquiry", ciId: optStr(fd, "ciId"),
    contactType: "self-service", assignmentGroupId: serviceDesk?.id ?? null,
  }, user));
  redirect(`/portal/ticket/incident/${inc.id}?created=1`);
}

export async function orderAction(fd: FormData) {
  const user = await requireUser();
  const itemId = str(fd, "itemId");
  const item = await db.catalogItem.findUniqueOrThrow({ where: { id: itemId } });
  const values: Record<string, string> = {};
  for (const v of parseVariables(item.variables)) values[v.name] = v.type === "checkbox" ? (fd.get(v.name) === "on" ? "true" : "") : str(fd, v.name);
  const requestedFor = str(fd, "requestedForId") || user.id;
  const { ritm } = await attempt(`/portal/catalog/${itemId}`, () =>
    orderItem(itemId, values, num(fd, "quantity", 1), requestedFor, user, str(fd, "instructions")));
  redirect(`/portal/ticket/sc_req_item/${ritm.id}?created=1`);
}

/** Customer can only act on their own tickets. */
async function ownTicket(table: string, id: string) {
  const user = await requireUser();
  if (table === "incident") {
    const inc = await db.incident.findUniqueOrThrow({ where: { id } });
    if (inc.callerId !== user.id && !isAgent(user)) throw new Error("Not your ticket");
  } else {
    const ritm = await db.requestItem.findUniqueOrThrow({ where: { id }, include: { request: true } });
    if (![ritm.request.requestedForId, ritm.request.requestedById].includes(user.id) && !isAgent(user)) throw new Error("Not your ticket");
  }
  return user;
}

export async function commentAction(fd: FormData) {
  const table = str(fd, "table") === "incident" ? "incident" : "sc_req_item";
  const id = str(fd, "id");
  const user = await ownTicket(table, id);
  await addJournal(table, id, "comments", str(fd, "body"), user.id);
  // A caller replying to an incident awaiting their input takes it off hold.
  if (table === "incident") {
    const inc = await db.incident.findUniqueOrThrow({ where: { id } });
    if (inc.state === "on_hold" && inc.onHoldReason === "awaiting_caller" && inc.callerId === user.id) {
      await updateIncident(id, { state: "in_progress" }, user);
    }
  }
  revalidatePath(`/portal/ticket/${table}/${id}`);
}

export async function resolutionResponseAction(response: "accept" | "reopen", fd: FormData) {
  const id = str(fd, "id");
  const user = await ownTicket("incident", id);
  const accept = response === "accept";
  await attempt(`/portal/ticket/incident/${id}`, () => updateIncident(id, { state: accept ? "closed" : "in_progress" }, user));
  await addJournal("incident", id, "comments", accept ? "Caller accepted the solution." : `Caller reopened the incident: ${str(fd, "reason") || "issue not resolved"}`, user.id);
  revalidatePath(`/portal/ticket/incident/${id}`);
}

export async function kbFeedbackAction(helpful: boolean, fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  await db.knowledgeArticle.update({ where: { id }, data: helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } } });
  redirect(`/portal/kb/${id}?thanks=1`);
}
