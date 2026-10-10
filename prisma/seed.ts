import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
process.env.SEEDING = "1";

const HOUR = 3600_000;
const ago = (h: number) => new Date(Date.now() - h * HOUR);

async function counter(prefix: string) {
  const c = await db.numberCounter.upsert({ where: { prefix }, create: { prefix, next: 10002 }, update: { next: { increment: 1 } } });
  return `${prefix}${String(c.next - 1).padStart(7, "0")}`;
}

const PRIORITY: Record<string, number> = { "1-1": 1, "1-2": 2, "1-3": 3, "2-1": 2, "2-2": 3, "2-3": 4, "3-1": 3, "3-2": 4, "3-3": 5 };

async function main() {
  console.log("Resetting data…");
  for (const t of [
    "taskSla", "slaDefinition", "auditLog", "journalEntry", "approval", "catalogTask", "requestItem", "request", "catalogItem",
    "catalogCategory", "incident", "problem", "changeRequest", "ciRelationship", "configurationItem", "knowledgeArticle",
    "groupRole", "userRole", "groupMember", "role", "group", "numberCounter",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db[t] as any).deleteMany();
  }
  await db.user.updateMany({ data: { managerId: null } });
  await db.user.deleteMany();

  // ---------- Roles ----------
  const roleDefs = [
    ["admin", "Full platform administration"],
    ["itil", "Fulfiller: work incidents, problems, changes and requests"],
    ["catalog_admin", "Manage the service catalog"],
    ["knowledge_admin", "Manage and publish knowledge articles"],
    ["cmdb_admin", "Manage configuration items"],
    ["approver_user", "Approve changes and requests"],
    ["change_manager", "Change Advisory Board, authorizes changes"],
  ];
  const roles: Record<string, string> = {};
  for (const [name, description] of roleDefs) roles[name] = (await db.role.create({ data: { name, description } })).id;

  // ---------- Users ----------
  const passwordHash = await bcrypt.hash("password", 10);
  const people: [string, string, string, string, string][] = [
    ["admin", "System", "Administrator", "Administrator", "IT"],
    ["beth.anglin", "Beth", "Anglin", "Service Desk Analyst", "IT"],
    ["fred.luddy", "Fred", "Luddy", "Senior Engineer", "IT"],
    ["david.loo", "David", "Loo", "Change Manager", "IT"],
    ["itil.agent", "Ivy", "Tilson", "Network Engineer", "IT"],
    ["don.goodliffe", "Don", "Goodliffe", "Database Administrator", "IT"],
    ["abel.tuter", "Abel", "Tuter", "Sales Representative", "Sales"],
    ["ava.chen", "Ava", "Chen", "Sales Director", "Sales"],
    ["bud.richman", "Bud", "Richman", "Accountant", "Finance"],
    ["carol.coughlin", "Carol", "Coughlin", "Finance Manager", "Finance"],
    ["dana.white", "Dana", "White", "HR Partner", "HR"],
  ];
  const u: Record<string, string> = {};
  for (const [userName, firstName, lastName, title, department] of people) {
    u[userName] = (await db.user.create({
      data: { userName, firstName, lastName, title, department, email: `${userName}@example.com`, passwordHash, location: "London" },
    })).id;
  }
  await db.user.update({ where: { id: u["abel.tuter"] }, data: { managerId: u["ava.chen"] } });
  await db.user.update({ where: { id: u["bud.richman"] }, data: { managerId: u["carol.coughlin"] } });
  await db.user.update({ where: { id: u["beth.anglin"] }, data: { managerId: u["david.loo"] } });

  await db.userRole.createMany({ data: [
    { userId: u.admin, roleId: roles.admin },
    { userId: u["david.loo"], roleId: roles.change_manager },
    { userId: u["david.loo"], roleId: roles.approver_user },
    { userId: u["ava.chen"], roleId: roles.approver_user },
    { userId: u["carol.coughlin"], roleId: roles.approver_user },
    { userId: u["fred.luddy"], roleId: roles.knowledge_admin },
  ] });

  // ---------- Groups ----------
  const groupDefs: [string, string, string, string[], string[]][] = [
    ["Service Desk", "First line support", "beth.anglin", ["beth.anglin", "fred.luddy"], ["itil"]],
    ["Network", "Network operations", "itil.agent", ["itil.agent", "fred.luddy"], ["itil"]],
    ["Database", "DBA team", "don.goodliffe", ["don.goodliffe"], ["itil"]],
    ["Software", "Application support", "fred.luddy", ["fred.luddy", "beth.anglin"], ["itil"]],
    ["Hardware", "Desktop and hardware support", "beth.anglin", ["beth.anglin"], ["itil"]],
    ["CAB Approval", "Change Advisory Board", "david.loo", ["david.loo"], ["itil", "approver_user"]],
    ["Catalog Fulfillment", "Fulfils service catalog requests", "beth.anglin", ["beth.anglin", "itil.agent"], ["itil"]],
  ];
  const g: Record<string, string> = {};
  for (const [name, description, mgr, members, groles] of groupDefs) {
    const grp = await db.group.create({ data: { name, description, managerId: u[mgr], email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com` } });
    g[name] = grp.id;
    await db.groupMember.createMany({ data: members.map((m) => ({ userId: u[m], groupId: grp.id })) });
    await db.groupRole.createMany({ data: groles.map((r) => ({ groupId: grp.id, roleId: roles[r] })) });
  }

  // ---------- CMDB ----------
  const ciDefs: [string, string, Partial<{ ip: string; os: string; env: string; crit: string; group: string; desc: string }>][] = [
    ["Email", "business_service", { crit: "1", group: "Software", desc: "Corporate email service" }],
    ["SAP ERP", "business_service", { crit: "1", group: "Software", desc: "Finance and supply chain" }],
    ["Corporate Network", "business_service", { crit: "1", group: "Network" }],
    ["Exchange Online", "application", { group: "Software" }],
    ["SAP ECC App", "application", { group: "Software" }],
    ["sap-db-01", "database", { ip: "10.0.2.21", os: "Oracle 19c", group: "Database" }],
    ["lnx-app-01", "server", { ip: "10.0.1.11", os: "RHEL 9", group: "Software" }],
    ["lnx-app-02", "server", { ip: "10.0.1.12", os: "RHEL 9", group: "Software" }],
    ["core-sw-01", "network", { ip: "10.0.0.1", os: "Cisco IOS XE", group: "Network" }],
    ["fw-edge-01", "network", { ip: "10.0.0.254", os: "PAN-OS 11", group: "Network" }],
    ["LT-ABEL-001", "computer", { os: "Windows 11", group: "Hardware" }],
    ["san-01", "storage", { ip: "10.0.3.5", group: "Hardware" }],
  ];
  const ci: Record<string, string> = {};
  for (const [name, ciClass, o] of ciDefs) {
    ci[name] = (await db.configurationItem.create({
      data: {
        name, ciClass, ipAddress: o.ip, os: o.os, environment: o.env ?? "production", criticality: o.crit ?? "3",
        supportGroupId: o.group ? g[o.group] : null, description: o.desc, ownedById: u["fred.luddy"],
        manufacturer: ciClass === "network" ? "Cisco" : ciClass === "server" ? "Dell" : null,
      },
    })).id;
  }
  const rels: [string, string, string][] = [
    ["Email", "Exchange Online", "depends_on"],
    ["SAP ERP", "SAP ECC App", "depends_on"],
    ["SAP ECC App", "lnx-app-01", "runs_on"],
    ["SAP ECC App", "lnx-app-02", "runs_on"],
    ["SAP ECC App", "sap-db-01", "depends_on"],
    ["sap-db-01", "san-01", "depends_on"],
    ["Corporate Network", "core-sw-01", "depends_on"],
    ["Corporate Network", "fw-edge-01", "depends_on"],
    ["lnx-app-01", "core-sw-01", "connected_to"],
  ];
  for (const [p, c, type] of rels) await db.ciRelationship.create({ data: { parentId: ci[p], childId: ci[c], type } });

  // ---------- SLA definitions ----------
  const slaDefs: [string, string, string, Record<string, string[]>, number][] = [
    ["P1 Response (15m)", "incident", "response", { priority: ["1"] }, 15],
    ["P1 Resolution (4h)", "incident", "resolution", { priority: ["1"] }, 240],
    ["P2 Response (30m)", "incident", "response", { priority: ["2"] }, 30],
    ["P2 Resolution (8h)", "incident", "resolution", { priority: ["2"] }, 480],
    ["P3 Resolution (2d)", "incident", "resolution", { priority: ["3"] }, 2880],
    ["P4/P5 Resolution (5d)", "incident", "resolution", { priority: ["4", "5"] }, 7200],
    ["Requested Item Fulfilment (5d)", "sc_req_item", "resolution", {}, 7200],
    ["Problem Resolution (30d)", "problem", "resolution", {}, 43200],
  ];
  for (const [name, table, type, cond, mins] of slaDefs) {
    await db.slaDefinition.create({ data: { name, table, type, condition: JSON.stringify(cond), durationMinutes: mins, pauseStates: table === "incident" ? "on_hold" : "" } });
  }

  // ---------- Problems ----------
  const prb1 = await db.problem.create({ data: {
    number: await counter("PRB"), shortDescription: "Intermittent SAP timeouts during month-end close",
    description: "Multiple users report SAP ERP timeouts between 17:00 and 19:00.", category: "software",
    impact: 1, urgency: 2, priority: 2, state: "rca", assignmentGroupId: g.Database, assignedToId: u["don.goodliffe"],
    ciId: ci["sap-db-01"], workaround: "Run month-end batch jobs after 19:00.", knownError: true, openedAt: ago(72),
  } });
  await db.problem.create({ data: {
    number: await counter("PRB"), shortDescription: "VPN drops for users on macOS 15", category: "network",
    impact: 2, urgency: 2, priority: 3, state: "assess", assignmentGroupId: g.Network, openedAt: ago(30),
  } });

  // ---------- Changes ----------
  const chg1 = await db.changeRequest.create({ data: {
    number: await counter("CHG"), shortDescription: "Increase SAP DB connection pool and add index on BKPF",
    type: "normal", category: "database", state: "authorize", risk: "moderate", impact: 2, priority: 3, approval: "requested",
    requestedById: u["don.goodliffe"], assignmentGroupId: g.Database, assignedToId: u["don.goodliffe"], ciId: ci["sap-db-01"],
    justification: "Resolves PRB timeouts during month-end close.",
    implementationPlan: "1. Snapshot DB\n2. Apply pool config\n3. Create index online", backoutPlan: "Revert pool config; drop index.",
    testPlan: "Run month-end simulation in QA.", plannedStart: new Date(Date.now() + 48 * HOUR), plannedEnd: new Date(Date.now() + 50 * HOUR),
    openedAt: ago(20),
  } });
  await db.approval.create({ data: { table: "change_request", recordId: chg1.id, approverId: u["david.loo"] } });
  await db.changeRequest.create({ data: {
    number: await counter("CHG"), shortDescription: "Monthly OS patching - Linux app servers", type: "standard", category: "software",
    state: "scheduled", risk: "low", impact: 3, priority: 4, approval: "approved", requestedById: u["fred.luddy"],
    assignmentGroupId: g.Software, assignedToId: u["fred.luddy"], ciId: ci["lnx-app-01"],
    implementationPlan: "Patch via Satellite, reboot in sequence.", backoutPlan: "Roll back to previous kernel.",
    plannedStart: new Date(Date.now() + 96 * HOUR), plannedEnd: new Date(Date.now() + 100 * HOUR), openedAt: ago(40),
  } });
  await db.changeRequest.create({ data: {
    number: await counter("CHG"), shortDescription: "Replace failed PSU on core-sw-01", type: "emergency", category: "hardware",
    state: "closed", risk: "high", impact: 1, priority: 2, approval: "approved", requestedById: u["itil.agent"],
    assignmentGroupId: g.Network, assignedToId: u["itil.agent"], ciId: ci["core-sw-01"], closeCode: "successful",
    closeNotes: "PSU replaced, redundancy restored.", plannedStart: ago(100), plannedEnd: ago(99), actualStart: ago(100), actualEnd: ago(99),
    openedAt: ago(101), closedAt: ago(98),
  } });

  // ---------- Incidents ----------
  const incDefs: { sd: string; caller: string; cat: string; i: number; ug: number; state: string; grp?: string; to?: string; ci?: string; h: number; prb?: string; res?: [string, string]; hold?: string }[] = [
    { sd: "Email not syncing on mobile", caller: "abel.tuter", cat: "software", i: 3, ug: 2, state: "in_progress", grp: "Service Desk", to: "beth.anglin", ci: "Email", h: 5 },
    { sd: "SAP very slow - cannot post invoices", caller: "bud.richman", cat: "software", i: 1, ug: 1, state: "in_progress", grp: "Database", to: "don.goodliffe", ci: "SAP ERP", h: 3, prb: "1" },
    { sd: "SAP timeout during month end", caller: "carol.coughlin", cat: "software", i: 2, ug: 1, state: "on_hold", grp: "Database", to: "don.goodliffe", ci: "SAP ERP", h: 26, prb: "1", hold: "awaiting_problem" },
    { sd: "Laptop won't boot after update", caller: "abel.tuter", cat: "hardware", i: 3, ug: 1, state: "new", grp: "Hardware", ci: "LT-ABEL-001", h: 1 },
    { sd: "Wi-Fi drops on 3rd floor", caller: "dana.white", cat: "network", i: 2, ug: 2, state: "in_progress", grp: "Network", to: "itil.agent", ci: "Corporate Network", h: 10 },
    { sd: "Need access to shared finance drive", caller: "bud.richman", cat: "inquiry", i: 3, ug: 3, state: "new", h: 2 },
    { sd: "Outlook keeps asking for password", caller: "ava.chen", cat: "software", i: 3, ug: 2, state: "resolved", grp: "Service Desk", to: "beth.anglin", ci: "Email", h: 50, res: ["solved_remotely", "Cleared cached credentials and re-registered MFA."] },
    { sd: "Printer on 2nd floor jammed", caller: "dana.white", cat: "hardware", i: 3, ug: 3, state: "closed", grp: "Hardware", to: "beth.anglin", h: 200, res: ["solved_permanently", "Removed jammed paper, replaced roller."] },
    { sd: "Network outage in London office", caller: "ava.chen", cat: "network", i: 1, ug: 1, state: "closed", grp: "Network", to: "itil.agent", ci: "core-sw-01", h: 102, res: ["solved_permanently", "Failed PSU replaced under emergency change."] },
    { sd: "Cannot connect to VPN from home", caller: "abel.tuter", cat: "network", i: 3, ug: 2, state: "in_progress", grp: "Network", to: "fred.luddy", h: 30 },
  ];
  for (const d of incDefs) {
    const openedAt = ago(d.h);
    const terminal = d.state === "resolved" || d.state === "closed";
    const inc = await db.incident.create({ data: {
      number: await counter("INC"), shortDescription: d.sd, description: d.sd, callerId: u[d.caller], category: d.cat,
      impact: d.i, urgency: d.ug, priority: PRIORITY[`${d.i}-${d.ug}`], state: d.state, onHoldReason: d.hold ?? null,
      assignmentGroupId: d.grp ? g[d.grp] : null, assignedToId: d.to ? u[d.to] : null, ciId: d.ci ? ci[d.ci] : null,
      problemId: d.prb ? prb1.id : null, contactType: "self-service", openedAt,
      resolvedAt: terminal ? ago(d.h - Math.min(d.h - 1, 4)) : null, closedAt: d.state === "closed" ? ago(d.h - 5) : null,
      resolutionCode: d.res?.[0], resolutionNotes: d.res?.[1],
    } });
    await db.journalEntry.create({ data: { table: "incident", recordId: inc.id, type: "comments", body: d.sd, authorId: u[d.caller], createdAt: openedAt } });
    // Attach SLAs as of the opening time.
    const defs = await db.slaDefinition.findMany({ where: { table: "incident" } });
    for (const def of defs) {
      const cond = JSON.parse(def.condition) as Record<string, string[]>;
      if (cond.priority && !cond.priority.includes(String(inc.priority))) continue;
      const breachTime = new Date(openedAt.getTime() + def.durationMinutes * 60_000);
      const responded = def.type === "response" && (d.to || d.state !== "new");
      const endTime = terminal ? inc.resolvedAt! : responded ? new Date(openedAt.getTime() + 10 * 60_000) : null;
      await db.taskSla.create({ data: {
        slaId: def.id, table: "incident", recordId: inc.id, startTime: openedAt, breachTime,
        stage: endTime ? "completed" : d.state === "on_hold" ? "paused" : "in_progress",
        pausedAt: d.state === "on_hold" ? ago(d.h - 2) : null,
        endTime, hasBreached: (endTime ?? new Date()) > breachTime,
      } });
    }
  }

  // ---------- Service Catalog ----------
  const cat = async (name: string, description: string, icon: string, order: number) =>
    (await db.catalogCategory.create({ data: { name, description, icon, order } })).id;
  const hw = await cat("Hardware", "Laptops, monitors and peripherals", "💻", 10);
  const sw = await cat("Software", "Licensed applications", "📦", 20);
  const acc = await cat("Access", "Access to systems and shared resources", "🔑", 30);
  const svc = await cat("Services", "Onboarding and other services", "🧑‍💼", 40);

  const items = [
    { name: "Standard Laptop", sd: "14\" business laptop, 16GB RAM", categoryId: hw, price: 1200, appr: true, days: 5,
      vars: [{ name: "os", label: "Operating system", type: "select", options: ["Windows 11", "macOS"], required: true },
        { name: "justification", label: "Business justification", type: "textarea", required: true }],
      tasks: ["Procure laptop from stock", "Image and configure device", "Deliver to user"] },
    { name: "External Monitor 27\"", sd: "27\" 4K monitor", categoryId: hw, price: 350, appr: false, days: 3,
      vars: [{ name: "quantity_note", label: "Desk location", type: "text", required: true }], tasks: ["Deliver and install monitor"] },
    { name: "Adobe Acrobat Pro", sd: "PDF editing licence", categoryId: sw, price: 180, appr: true, days: 2,
      vars: [{ name: "duration", label: "Licence term", type: "select", options: ["1 year", "Perpetual"], required: true }], tasks: ["Assign licence and install"] },
    { name: "Microsoft Visio", sd: "Diagramming software", categoryId: sw, price: 280, appr: true, days: 2, vars: [], tasks: ["Assign licence and install"] },
    { name: "Shared Drive Access", sd: "Read or write access to a network share", categoryId: acc, price: 0, appr: true, days: 1,
      vars: [{ name: "share", label: "Share path", type: "text", required: true }, { name: "access", label: "Access level", type: "select", options: ["Read", "Read/Write"], required: true }],
      tasks: ["Grant AD group membership"] },
    { name: "VPN Access", sd: "Remote access to the corporate network", categoryId: acc, price: 0, appr: false, days: 1, vars: [], tasks: ["Enable VPN profile"] },
    { name: "New Hire Onboarding", sd: "Accounts, equipment and access for a new starter", categoryId: svc, price: 0, appr: true, days: 7,
      vars: [{ name: "new_hire", label: "New hire name", type: "text", required: true }, { name: "start_date", label: "Start date", type: "date", required: true },
        { name: "needs_laptop", label: "Needs a laptop", type: "checkbox" }],
      tasks: ["Create AD account and mailbox", "Prepare laptop", "Grant application access"] },
  ];
  const itemIds: Record<string, string> = {};
  for (const it of items) {
    itemIds[it.name] = (await db.catalogItem.create({ data: {
      name: it.name, shortDescription: it.sd, description: it.sd, categoryId: it.categoryId, price: it.price,
      requiresApproval: it.appr, deliveryDays: it.days, fulfillmentGroupId: g["Catalog Fulfillment"],
      variables: JSON.stringify(it.vars), taskTemplates: JSON.stringify(it.tasks),
    } })).id;
  }

  // One request awaiting manager approval, one in fulfilment.
  const req1 = await db.request.create({ data: { number: await counter("REQ"), requestedForId: u["abel.tuter"], requestedById: u["abel.tuter"], approval: "requested", openedAt: ago(6) } });
  const ritm1 = await db.requestItem.create({ data: {
    number: await counter("RITM"), requestId: req1.id, itemId: itemIds["Standard Laptop"], approval: "requested", stage: "waiting_for_approval",
    variables: JSON.stringify({ os: "macOS", justification: "Current laptop is 5 years old and failing." }), assignmentGroupId: g["Catalog Fulfillment"], openedAt: ago(6),
  } });
  await db.approval.create({ data: { table: "sc_req_item", recordId: ritm1.id, approverId: u["ava.chen"] } });

  const req2 = await db.request.create({ data: { number: await counter("REQ"), requestedForId: u["bud.richman"], requestedById: u["bud.richman"], approval: "approved", openedAt: ago(28) } });
  const ritm2 = await db.requestItem.create({ data: {
    number: await counter("RITM"), requestId: req2.id, itemId: itemIds["Shared Drive Access"], approval: "approved", stage: "fulfillment", state: "work_in_progress",
    variables: JSON.stringify({ share: "\\\\fs01\\finance", access: "Read/Write" }), assignmentGroupId: g["Catalog Fulfillment"], openedAt: ago(28),
  } });
  await db.approval.create({ data: { table: "sc_req_item", recordId: ritm2.id, approverId: u["carol.coughlin"], state: "approved", decidedAt: ago(27), comments: "Approved" } });
  await db.catalogTask.create({ data: { number: await counter("SCTASK"), ritmId: ritm2.id, shortDescription: "Grant AD group membership", assignmentGroupId: g["Catalog Fulfillment"], assignedToId: u["beth.anglin"], state: "work_in_progress", openedAt: ago(27) } });
  const ritmSla = await db.slaDefinition.findFirstOrThrow({ where: { table: "sc_req_item" } });
  for (const [r, h] of [[ritm1, 6], [ritm2, 28]] as const) {
    await db.taskSla.create({ data: { slaId: ritmSla.id, table: "sc_req_item", recordId: r.id, startTime: ago(h), breachTime: new Date(ago(h).getTime() + ritmSla.durationMinutes * 60_000) } });
  }
  const prbSla = await db.slaDefinition.findFirstOrThrow({ where: { table: "problem" } });
  for (const p of await db.problem.findMany()) {
    await db.taskSla.create({ data: { slaId: prbSla.id, table: "problem", recordId: p.id, startTime: p.openedAt, breachTime: new Date(p.openedAt.getTime() + prbSla.durationMinutes * 60_000) } });
  }

  // ---------- Knowledge ----------
  const kb = [
    ["How to reset your password", "how_to", "## Reset your password\n\n1. Go to the self-service password portal.\n2. Enter your user name and complete MFA.\n3. Choose a new password (12+ characters).\n\nIf you are locked out, contact the Service Desk.", "password, reset, locked"],
    ["Connecting to the VPN", "how_to", "## VPN setup\n\n1. Install the GlobalProtect client from the Software Center.\n2. Portal address: `vpn.example.com`.\n3. Sign in with your corporate credentials.\n\n**macOS 15:** see the known error article if the connection drops.", "vpn, remote, globalprotect"],
    ["Outlook keeps prompting for credentials", "troubleshooting", "## Symptoms\nOutlook repeatedly prompts for a password.\n\n## Fix\n1. Close Outlook.\n2. Open Credential Manager and remove entries starting with `MicrosoftOffice`.\n3. Restart Outlook and sign in.", "outlook, email, password"],
    ["Known error: SAP timeouts at month-end", "known_error", "## Workaround\nSchedule heavy month-end batch jobs after 19:00 until the database fix (see CHG) is deployed.", "sap, timeout"],
    ["Acceptable use policy", "policy", "All company IT resources must be used in accordance with the acceptable use policy…", "policy"],
  ];
  for (const [title, category, body, keywords] of kb) {
    await db.knowledgeArticle.create({ data: {
      number: await counter("KB"), title, category, body, keywords, state: "published", authorId: u["fred.luddy"],
      publishedAt: ago(500), views: Math.floor(Math.random() * 400),
    } });
  }
  await db.knowledgeArticle.create({ data: {
    number: await counter("KB"), title: "Configuring a new printer (draft)", category: "how_to", body: "Draft content…", state: "review", authorId: u["beth.anglin"],
  } });

  console.log("Seed complete. Log in as admin / password.");
}

main().finally(() => db.$disconnect());
