import { db } from "./db";
import type { SessionUser } from "./roles";

type Rec = Record<string, unknown>;

function fmt(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Writes one AuditLog row per changed field (sys_audit equivalent). */
export async function auditChanges(
  table: string, recordId: string, before: Rec | null, after: Rec, user: SessionUser | null, fields: string[],
) {
  const rows = [];
  for (const f of fields) {
    const o = before ? fmt(before[f]) : null;
    const n = fmt(after[f]);
    if (o !== n) rows.push({ table, recordId, field: f, oldValue: o, newValue: n, userId: user?.id, userName: user?.name });
  }
  if (rows.length) await db.auditLog.createMany({ data: rows });
}

export async function addJournal(table: string, recordId: string, type: "work_notes" | "comments", body: string, authorId: string) {
  const text = body.trim();
  if (!text) return;
  await db.journalEntry.create({ data: { table, recordId, type, body: text, authorId } });
}
