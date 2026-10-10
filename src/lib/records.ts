// Maps a task table + id to its URL and display number.
import { db } from "./db";

export const TABLE_PATH: Record<string, string> = {
  incident: "/incident", problem: "/problem", change_request: "/change", sc_req_item: "/sc/ritm", sc_task: "/sc/task", kb_knowledge: "/kb",
};

export async function recordNumbers(table: string, ids: string[]): Promise<Record<string, string>> {
  const where = { where: { id: { in: ids } }, select: { id: true, number: true } };
  const rows =
    table === "incident" ? await db.incident.findMany(where)
    : table === "problem" ? await db.problem.findMany(where)
    : table === "change_request" ? await db.changeRequest.findMany(where)
    : table === "sc_req_item" ? await db.requestItem.findMany(where)
    : [];
  return Object.fromEntries(rows.map((r) => [r.id, r.number]));
}
