import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/auth";
import { API_TABLES, clean, isApiTable } from "@/lib/table-api";
import { createIncident } from "@/lib/rules/incident";

type Ctx = { params: Promise<{ table: string }> };

/**
 * GET /api/now/table/{table}?sysparm_query=text&sysparm_limit=20&sysparm_offset=0
 * Modelled on the ServiceNow Table API.
 */
export async function GET(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: { message: "User Not Authenticated" } }, { status: 401 });
  const { table } = await params;
  if (!isApiTable(table)) return NextResponse.json({ error: { message: `Invalid table ${table}` } }, { status: 400 });
  if (!hasRole(user, "itil") && table !== "kb_knowledge") return NextResponse.json({ error: { message: "Insufficient rights" } }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(1000, parseInt(url.searchParams.get("sysparm_limit") ?? "20", 10) || 20);
  const offset = parseInt(url.searchParams.get("sysparm_offset") ?? "0", 10) || 0;
  const q = url.searchParams.get("sysparm_query");
  const def = API_TABLES[table];
  const where: Record<string, unknown> = q ? { OR: def.search.map((f) => ({ [f]: { contains: q } })) } : {};
  if (table === "kb_knowledge" && !hasRole(user, "itil")) where.state = "published";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = def.model() as any;
  const [rows, total] = await Promise.all([model.findMany({ where, skip: offset, take: limit }), model.count({ where })]);
  return NextResponse.json({ result: rows.map(clean) }, { headers: { "X-Total-Count": String(total) } });
}

/** POST /api/now/table/incident creates an incident through the same business rules as the UI. */
export async function POST(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: { message: "User Not Authenticated" } }, { status: 401 });
  const { table } = await params;
  if (table !== "incident") return NextResponse.json({ error: { message: "Only incident supports POST" } }, { status: 405 });
  const body = await req.json().catch(() => null);
  if (!body?.shortDescription) return NextResponse.json({ error: { message: "shortDescription is required" } }, { status: 400 });
  try {
    const inc = await createIncident({
      shortDescription: String(body.shortDescription), description: body.description ?? null,
      callerId: hasRole(user, "itil") && body.callerId ? String(body.callerId) : user.id,
      impact: Number(body.impact) || 3, urgency: Number(body.urgency) || 3, category: body.category ?? "inquiry",
      contactType: body.contactType ?? "email", assignmentGroupId: body.assignmentGroupId ?? null, ciId: body.ciId ?? null,
    }, user);
    return NextResponse.json({ result: inc }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { message: e instanceof Error ? e.message : "Failed" } }, { status: 400 });
  }
}
