import { db } from "./db";

export const PREFIX = {
  incident: "INC",
  problem: "PRB",
  change_request: "CHG",
  sc_request: "REQ",
  sc_req_item: "RITM",
  sc_task: "SCTASK",
  kb_knowledge: "KB",
} as const;

/** Returns the next record number for a prefix, e.g. INC0010001. */
export async function nextNumber(prefix: string): Promise<string> {
  const counter = await db.numberCounter.upsert({
    where: { prefix },
    create: { prefix, next: 10002 },
    update: { next: { increment: 1 } },
  });
  return `${prefix}${String(counter.next - 1).padStart(7, "0")}`;
}
