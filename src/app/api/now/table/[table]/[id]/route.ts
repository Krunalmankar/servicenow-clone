import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/auth";
import { API_TABLES, clean, isApiTable } from "@/lib/table-api";
import { updateIncident, type IncidentInput } from "@/lib/rules/incident";

type Ctx = { params: Promise<{ table: string; id: string }> };

const WRITABLE: (keyof IncidentInput)[] = [
  "shortDescription", "description", "category", "subcategory", "impact", "urgency", "state", "onHoldReason",
  "assignmentGroupId", "assignedToId", "ciId", "problemId", "resolutionCode", "resolutionNotes",
];

/** GET by id or record number. */
export async function GET(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: { message: "User Not Authenticated" } }, { status: 401 });
  const { table, id } = await params;
  if (!isApiTable(table)) return NextResponse.json({ error: { message: `Invalid table ${table}` } }, { status: 400 });
  if (!hasRole(user, "itil")) return NextResponse.json({ error: { message: "Insufficient rights" } }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = API_TABLES[table].model() as any;
  const hasNumber = !["cmdb_ci", "sys_user", "sys_user_group"].includes(table);
  const row = await model.findFirst({ where: hasNumber ? { OR: [{ id }, { number: id.toUpperCase() }] } : { id } });
  if (!row) return NextResponse.json({ error: { message: "No Record found" } }, { status: 404 });
  return NextResponse.json({ result: clean(row) });
}

/** PATCH /api/now/table/incident/{id} updates through incident business rules (SLA, audit, priority). */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: { message: "User Not Authenticated" } }, { status: 401 });
  const { table, id } = await params;
  if (table !== "incident") return NextResponse.json({ error: { message: "Only incident supports PATCH" } }, { status: 405 });
  if (!hasRole(user, "itil")) return NextResponse.json({ error: { message: "Insufficient rights" } }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input: Record<string, unknown> = {};
  for (const k of WRITABLE) if (k in body) input[k] = k === "impact" || k === "urgency" ? Number(body[k]) : body[k];
  try {
    const inc = await updateIncident(id, input as IncidentInput, user);
    return NextResponse.json({ result: inc });
  } catch (e) {
    return NextResponse.json({ error: { message: e instanceof Error ? e.message : "Failed" } }, { status: 400 });
  }
}
