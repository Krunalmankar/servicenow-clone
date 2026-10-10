// Business-rule tests. Run with `npm test` (uses a throwaway SQLite database seeded with demo data).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { calcPriority } from "../src/lib/priority";
import { createIncident, updateIncident } from "../src/lib/rules/incident";
import { createChange, updateChange } from "../src/lib/rules/change";
import { decideApproval } from "../src/lib/rules/approval";
import { orderItem, updateCatalogTask } from "../src/lib/rules/catalog";
import { saveArticle, transitionArticle } from "../src/lib/rules/knowledge";
import { slaProgress } from "../src/lib/sla";
import type { SessionUser } from "../src/lib/roles";

async function session(userName: string): Promise<SessionUser> {
  const u = await db.user.findUniqueOrThrow({
    where: { userName },
    include: { roles: { include: { role: true } }, memberships: { include: { group: { include: { roles: { include: { role: true } } } } } } },
  });
  const roles = new Set(u.roles.map((r) => r.role.name));
  for (const m of u.memberships) for (const r of m.group.roles) roles.add(r.role.name);
  return { id: u.id, userName, name: `${u.firstName} ${u.lastName}`, email: u.email, roles: [...roles], groupIds: u.memberships.map((m) => m.groupId) };
}

const slas = (recordId: string) => db.taskSla.findMany({ where: { recordId }, include: { sla: true }, orderBy: { startTime: "asc" } });

let agent: SessionUser, caller: SessionUser, manager: SessionUser, cab: SessionUser, kbAdmin: SessionUser;

before(async () => {
  agent = await session("beth.anglin");
  caller = await session("abel.tuter");
  manager = await session("ava.chen");
  cab = await session("david.loo");
  kbAdmin = await session("fred.luddy");
});

test("priority matrix follows impact x urgency", () => {
  assert.equal(calcPriority(1, 1), 1);
  assert.equal(calcPriority(1, 2), 2);
  assert.equal(calcPriority(2, 2), 3);
  assert.equal(calcPriority(3, 2), 4);
  assert.equal(calcPriority(3, 3), 5);
});

test("incident numbering, priority and P1 SLAs attach on insert", async () => {
  const inc = await createIncident({ shortDescription: "Test outage", callerId: caller.id, impact: 1, urgency: 1 }, agent);
  assert.match(inc.number, /^INC\d{7}$/);
  assert.equal(inc.priority, 1);
  const s = await slas(inc.id);
  assert.deepEqual(s.map((x) => x.sla.name).sort(), ["P1 Resolution (4h)", "P1 Response (15m)"]);
  assert.ok(s.every((x) => x.stage === "in_progress"));
});

test("assigning completes the response SLA and moves New to In Progress", async () => {
  const inc = await createIncident({ shortDescription: "Assign me", callerId: caller.id, impact: 1, urgency: 1 }, agent);
  const updated = await updateIncident(inc.id, { assignedToId: agent.id }, agent);
  assert.equal(updated.state, "in_progress");
  const s = await slas(inc.id);
  assert.equal(s.find((x) => x.sla.type === "response")?.stage, "completed");
  assert.equal(s.find((x) => x.sla.type === "resolution")?.stage, "in_progress");
});

test("on hold pauses the resolution SLA and resuming pushes the breach time out", async () => {
  const inc = await createIncident({ shortDescription: "Hold me", callerId: caller.id, impact: 2, urgency: 1, assignedToId: agent.id }, agent);
  await assert.rejects(updateIncident(inc.id, { state: "on_hold" }, agent), /On hold reason is required/);
  await updateIncident(inc.id, { state: "on_hold", onHoldReason: "awaiting_caller" }, agent);
  let res = (await slas(inc.id)).find((x) => x.sla.type === "resolution")!;
  assert.equal(res.stage, "paused");
  const originalBreach = res.breachTime.getTime();
  // Simulate 10 minutes on hold.
  await db.taskSla.update({ where: { id: res.id }, data: { pausedAt: new Date(Date.now() - 600_000) } });
  await updateIncident(inc.id, { state: "in_progress" }, agent);
  res = (await slas(inc.id)).find((x) => x.sla.type === "resolution")!;
  assert.equal(res.stage, "in_progress");
  assert.ok(res.pausedSeconds >= 599);
  assert.ok(res.breachTime.getTime() - originalBreach >= 599_000);
});

test("resolving requires code + notes, completes SLA; reopening resumes it", async () => {
  const inc = await createIncident({ shortDescription: "Resolve me", callerId: caller.id, impact: 2, urgency: 2, assignedToId: agent.id }, agent);
  await assert.rejects(updateIncident(inc.id, { state: "resolved" }, agent), /Resolution code and resolution notes/);
  const r = await updateIncident(inc.id, { state: "resolved", resolutionCode: "solved_remotely", resolutionNotes: "Fixed" }, agent);
  assert.ok(r.resolvedAt);
  assert.equal((await slas(inc.id))[0].stage, "completed");
  const reopened = await updateIncident(inc.id, { state: "in_progress" }, caller);
  assert.equal(reopened.reopenCount, 1);
  assert.equal(reopened.resolvedAt, null);
  assert.equal((await slas(inc.id))[0].stage, "in_progress");
});

test("priority change cancels the old SLA and attaches the new one", async () => {
  const inc = await createIncident({ shortDescription: "Escalate me", callerId: caller.id, impact: 3, urgency: 3 }, agent);
  assert.equal((await slas(inc.id))[0].sla.name, "P4/P5 Resolution (5d)");
  await updateIncident(inc.id, { impact: 1, urgency: 1 }, agent);
  const s = await slas(inc.id);
  assert.equal(s.find((x) => x.sla.name === "P4/P5 Resolution (5d)")?.stage, "cancelled");
  assert.equal(s.find((x) => x.sla.name === "P1 Resolution (4h)")?.stage, "in_progress");
});

test("field changes are written to the audit log", async () => {
  const inc = await createIncident({ shortDescription: "Audit me", callerId: caller.id }, agent);
  await updateIncident(inc.id, { urgency: 1 }, agent);
  const rows = await db.auditLog.findMany({ where: { recordId: inc.id, oldValue: { not: null } } });
  assert.ok(rows.some((r) => r.field === "urgency" && r.oldValue === "3" && r.newValue === "1"));
  assert.ok(rows.some((r) => r.field === "priority" && r.oldValue === "5" && r.newValue === "3"));
});

test("SLA progress reports breach once elapsed time passes the duration", async () => {
  const inc = await createIncident({ shortDescription: "Breach me", callerId: caller.id, impact: 1, urgency: 1 }, agent);
  const s = (await slas(inc.id)).find((x) => x.sla.type === "response")!;
  const later = new Date(Date.now() + 20 * 60_000);
  const p = slaProgress(s, later);
  assert.ok(p.breached);
  assert.ok(p.percent >= 130);
});

test("normal change: approval gate, CAB approval schedules it, closing needs close notes", async () => {
  const start = new Date(Date.now() + 86400_000), end = new Date(Date.now() + 90000_000);
  const c = await createChange({ shortDescription: "Upgrade switch firmware", plannedStart: start, plannedEnd: end }, agent);
  assert.equal(c.approval, "not_requested");
  await assert.rejects(updateChange(c.id, { state: "authorize" }, agent), /Implementation and backout plans/);
  await updateChange(c.id, { implementationPlan: "Upgrade", backoutPlan: "Downgrade" }, agent);
  await assert.rejects(updateChange(c.id, { state: "scheduled" }, agent), /must be approved/);
  const authorized = await updateChange(c.id, { state: "authorize" }, agent);
  assert.equal(authorized.approval, "requested");
  const approvals = await db.approval.findMany({ where: { recordId: c.id, state: "requested" } });
  assert.ok(approvals.some((a) => a.approverId === cab.id));
  for (const a of approvals) await decideApproval(a.id, "approved", "", await session((await db.user.findUniqueOrThrow({ where: { id: a.approverId } })).userName));
  const scheduled = await db.changeRequest.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(scheduled.state, "scheduled");
  assert.equal(scheduled.approval, "approved");
  const impl = await updateChange(c.id, { state: "implement" }, agent);
  assert.ok(impl.actualStart);
  await updateChange(c.id, { state: "review" }, agent);
  await assert.rejects(updateChange(c.id, { state: "closed" }, agent), /Close code and close notes/);
  const closed = await updateChange(c.id, { state: "closed", closeCode: "successful", closeNotes: "Done" }, agent);
  assert.ok(closed.closedAt);
});

test("rejecting a change sends it back to New; standard changes are pre-approved", async () => {
  const c = await createChange({ shortDescription: "Risky", implementationPlan: "x", backoutPlan: "y", plannedStart: new Date(Date.now() + 1e7), plannedEnd: new Date(Date.now() + 2e7) }, agent);
  await updateChange(c.id, { state: "authorize" }, agent);
  const a = await db.approval.findFirstOrThrow({ where: { recordId: c.id, approverId: cab.id, state: "requested" } });
  await assert.rejects(decideApproval(a.id, "rejected", "", cab), /Comments are required/);
  await decideApproval(a.id, "rejected", "Too risky this week", cab);
  const after = await db.changeRequest.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(after.state, "new");
  assert.equal(after.approval, "rejected");

  const std = await createChange({ shortDescription: "Patch", type: "standard", plannedStart: new Date(Date.now() + 1e7), plannedEnd: new Date(Date.now() + 2e7) }, agent);
  assert.equal(std.approval, "approved");
  const s = await updateChange(std.id, { state: "scheduled" }, agent);
  assert.equal(s.state, "scheduled");
});

test("catalog order with approval: manager approves, tasks created, closing tasks fulfils request", async () => {
  const laptop = await db.catalogItem.findFirstOrThrow({ where: { name: "Standard Laptop" } });
  await assert.rejects(orderItem(laptop.id, { os: "macOS" }, 1, caller.id, caller), /Business justification is required/);
  const { req, ritm } = await orderItem(laptop.id, { os: "macOS", justification: "Old laptop" }, 1, caller.id, caller);
  assert.match(req.number, /^REQ/);
  const appr = await db.approval.findFirstOrThrow({ where: { recordId: ritm.id } });
  assert.equal(appr.approverId, manager.id, "approval goes to the requester's manager");
  await assert.rejects(decideApproval(appr.id, "approved", "", agent), /not the approver/);
  await decideApproval(appr.id, "approved", "ok", manager);
  const tasks = await db.catalogTask.findMany({ where: { ritmId: ritm.id } });
  assert.equal(tasks.length, 3);
  let r = await db.requestItem.findUniqueOrThrow({ where: { id: ritm.id } });
  assert.equal(r.stage, "fulfillment");
  for (const t of tasks) await updateCatalogTask(t.id, { state: "closed_complete" }, agent);
  r = await db.requestItem.findUniqueOrThrow({ where: { id: ritm.id } });
  assert.equal(r.state, "closed_complete");
  assert.equal(r.stage, "delivered");
  const request = await db.request.findUniqueOrThrow({ where: { id: req.id } });
  assert.equal(request.state, "closed_complete");
  const sla = await db.taskSla.findFirstOrThrow({ where: { recordId: ritm.id } });
  assert.equal(sla.stage, "completed");
});

test("catalog order without approval goes straight to fulfilment; rejection closes incomplete", async () => {
  const vpn = await db.catalogItem.findFirstOrThrow({ where: { name: "VPN Access" } });
  const { ritm } = await orderItem(vpn.id, {}, 1, caller.id, caller);
  const r = await db.requestItem.findUniqueOrThrow({ where: { id: ritm.id }, include: { tasks: true } });
  assert.equal(r.stage, "fulfillment");
  assert.equal(r.tasks.length, 1);

  const visio = await db.catalogItem.findFirstOrThrow({ where: { name: "Microsoft Visio" } });
  const o = await orderItem(visio.id, {}, 1, caller.id, caller);
  const appr = await db.approval.findFirstOrThrow({ where: { recordId: o.ritm.id } });
  await decideApproval(appr.id, "rejected", "No budget", manager);
  const rejected = await db.requestItem.findUniqueOrThrow({ where: { id: o.ritm.id } });
  assert.equal(rejected.state, "closed_incomplete");
  assert.equal((await db.request.findUniqueOrThrow({ where: { id: o.req.id } })).state, "closed_incomplete");
});

test("knowledge lifecycle: only knowledge admins publish", async () => {
  const a = await saveArticle(null, { title: "Test article", body: "Body", category: "how_to", knowledgeBase: "IT", keywords: null }, agent);
  assert.equal(a.state, "draft");
  await assert.rejects(transitionArticle(a.id, "published", agent), /Cannot move an article from draft/);
  await transitionArticle(a.id, "review", agent);
  await assert.rejects(transitionArticle(a.id, "published", agent), /Only knowledge admins/);
  const pub = await transitionArticle(a.id, "published", kbAdmin);
  assert.equal(pub.state, "published");
  assert.ok(pub.publishedAt);
});
