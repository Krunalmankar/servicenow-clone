import { db } from "./db";
import type { SlaDefinition, TaskSla } from "@prisma/client";

/** States that end a resolution SLA, per table. "cancel" states cancel instead of complete. */
const TERMINAL: Record<string, { complete: string[]; cancel: string[] }> = {
  incident: { complete: ["resolved", "closed"], cancel: ["canceled"] },
  problem: { complete: ["resolved", "closed"], cancel: [] },
  change_request: { complete: ["closed"], cancel: ["canceled"] },
  sc_req_item: { complete: ["closed_complete"], cancel: ["closed_incomplete"] },
};

const INITIAL_STATE: Record<string, string> = {
  incident: "new", problem: "new", change_request: "new", sc_req_item: "open",
};

type TaskRecord = { id: string; state: string; assignedToId?: string | null } & Record<string, unknown>;

function matches(def: SlaDefinition, rec: TaskRecord) {
  let cond: Record<string, string[]> = {};
  try { cond = JSON.parse(def.condition || "{}"); } catch { /* treat as match-all */ }
  return Object.entries(cond).every(([field, values]) => values.map(String).includes(String(rec[field] ?? "")));
}

function stopReached(def: SlaDefinition, rec: TaskRecord): "complete" | "cancel" | null {
  const t = TERMINAL[def.table];
  if (t.cancel.includes(rec.state)) return "cancel";
  if (t.complete.includes(rec.state)) return "complete";
  if (def.type === "response" && (rec.assignedToId || rec.state !== INITIAL_STATE[def.table])) return "complete";
  return null;
}

const secondsBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));

/**
 * SLA engine: attaches, pauses, resumes, completes and cancels Task SLAs for a record.
 * Call after every insert/update of an SLA-tracked record.
 */
export async function processSlas(table: string, rec: TaskRecord) {
  const now = new Date();
  const defs = await db.slaDefinition.findMany({ where: { table, active: true } });
  const existing = await db.taskSla.findMany({ where: { table, recordId: rec.id } });

  for (const def of defs) {
    const mine = existing.filter((t) => t.slaId === def.id);
    const active = mine.find((t) => t.stage === "in_progress" || t.stage === "paused");
    const stop = stopReached(def, rec);
    const pauseStates = def.pauseStates.split(",").map((s) => s.trim()).filter(Boolean);

    if (active) {
      if (!matches(def, rec)) {
        await db.taskSla.update({ where: { id: active.id }, data: { stage: "cancelled", endTime: now } });
      } else if (stop) {
        await finish(active, stop === "complete" ? "completed" : "cancelled", now);
      } else if (pauseStates.includes(rec.state) && active.stage === "in_progress") {
        await db.taskSla.update({ where: { id: active.id }, data: { stage: "paused", pausedAt: now } });
      } else if (!pauseStates.includes(rec.state) && active.stage === "paused") {
        await resume(active, now);
      }
      continue;
    }

    if (!matches(def, rec)) continue;

    // Reopened record: resume a completed resolution SLA, treating the resolved period as paused time.
    const completed = mine.find((t) => t.stage === "completed");
    if (completed) {
      if (def.type === "resolution" && !stop && completed.endTime) {
        const gap = secondsBetween(completed.endTime, now);
        await db.taskSla.update({
          where: { id: completed.id },
          data: {
            stage: "in_progress", endTime: null, pausedSeconds: completed.pausedSeconds + gap,
            breachTime: new Date(completed.breachTime.getTime() + gap * 1000),
          },
        });
      }
      continue;
    }
    if (stop || mine.some((t) => t.stage === "cancelled" && def.type === "response")) continue;

    await db.taskSla.create({
      data: {
        slaId: def.id, table, recordId: rec.id, startTime: now,
        breachTime: new Date(now.getTime() + def.durationMinutes * 60_000),
        stage: pauseStates.includes(rec.state) ? "paused" : "in_progress",
        pausedAt: pauseStates.includes(rec.state) ? now : null,
      },
    });
  }
}

async function resume(t: TaskSla, now: Date) {
  const gap = t.pausedAt ? secondsBetween(t.pausedAt, now) : 0;
  await db.taskSla.update({
    where: { id: t.id },
    data: {
      stage: "in_progress", pausedAt: null, pausedSeconds: t.pausedSeconds + gap,
      breachTime: new Date(t.breachTime.getTime() + gap * 1000),
    },
  });
}

async function finish(t: TaskSla, stage: "completed" | "cancelled", now: Date) {
  let { breachTime, pausedSeconds } = t;
  if (t.stage === "paused" && t.pausedAt) {
    const gap = secondsBetween(t.pausedAt, now);
    pausedSeconds += gap;
    breachTime = new Date(breachTime.getTime() + gap * 1000);
  }
  await db.taskSla.update({
    where: { id: t.id },
    data: { stage, endTime: now, pausedAt: null, pausedSeconds, breachTime, hasBreached: now > breachTime },
  });
}

/** Live view of a Task SLA: elapsed time, % used and breach state. */
export function slaProgress(t: TaskSla & { sla: SlaDefinition }, now = new Date()) {
  const end = t.endTime ?? (t.stage === "paused" && t.pausedAt ? t.pausedAt : now);
  const elapsed = Math.max(0, (end.getTime() - t.startTime.getTime()) / 1000 - t.pausedSeconds);
  const total = t.sla.durationMinutes * 60;
  const percent = total ? Math.round((elapsed / total) * 100) : 0;
  const breached = t.hasBreached || percent >= 100;
  const remaining = Math.round(total - elapsed);
  return { elapsed: Math.round(elapsed), total, percent, breached, remaining };
}

/** Flags running SLAs whose breach time has passed. Cheap enough to call on dashboard/list loads. */
export async function markBreaches() {
  await db.taskSla.updateMany({
    where: { stage: "in_progress", hasBreached: false, breachTime: { lt: new Date() } },
    data: { hasBreached: true },
  });
}

export function formatDuration(seconds: number) {
  const neg = seconds < 0;
  let s = Math.abs(seconds);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  const out = d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
  return neg ? `-${out}` : out;
}
