import { db } from "@/lib/db";
import { formatDuration, slaProgress } from "@/lib/sla";
import { fmtDate } from "@/lib/list";
import { StateBadge } from "./Badges";

export async function SlaPanel({ table, recordId }: { table: string; recordId: string }) {
  const slas = await db.taskSla.findMany({ where: { table, recordId }, include: { sla: true }, orderBy: { startTime: "asc" } });
  if (!slas.length) return null;
  return (
    <div className="border-t border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Task SLAs</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr><th className="py-1">SLA</th><th>Stage</th><th className="w-1/3">Elapsed</th><th>Breach time</th><th>Time left</th></tr>
        </thead>
        <tbody>
          {slas.map((t) => {
            const p = slaProgress(t);
            const bar = p.breached ? "bg-red-500" : p.percent >= 75 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="py-2">{t.sla.name}</td>
                <td><StateBadge list="slaStage" value={t.stage} /></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded bg-gray-200"><div className={`h-2 rounded ${bar}`} style={{ width: `${Math.min(100, p.percent)}%` }} /></div>
                    <span className={`w-12 text-right text-xs ${p.breached ? "font-semibold text-red-600" : ""}`}>{p.percent}%</span>
                  </div>
                </td>
                <td className="text-xs">{fmtDate(t.breachTime)}</td>
                <td className={`text-xs ${p.breached ? "text-red-600" : ""}`}>
                  {t.stage === "completed" || t.stage === "cancelled" ? "—" : formatDuration(p.remaining)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
