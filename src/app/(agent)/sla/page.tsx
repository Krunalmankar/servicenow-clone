import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/choices";
import { listParams, type SearchParams } from "@/lib/list";
import { formatDuration } from "@/lib/sla";
import { ListView, type Column } from "@/components/ListView";

export default async function SlaDefs({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("itil");
  const params = await searchParams;
  const lp = listParams(params, "name", "asc");
  const rows = await db.slaDefinition.findMany({ orderBy: [{ table: "asc" }, { name: "asc" }], include: { _count: { select: { taskSlas: true } } } });
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "name", label: "Name", render: (r) => r.name },
    { key: "table", label: "Table", render: (r) => label("slaTable", r.table) },
    { key: "type", label: "Type", render: (r) => label("slaType", r.type) },
    { key: "condition", label: "Start condition", render: (r) => {
      const c = JSON.parse(r.condition) as Record<string, string[]>;
      return Object.keys(c).length ? Object.entries(c).map(([k, v]) => `${k} in ${v.join(", ")}`).join("; ") : "All records";
    } },
    { key: "duration", label: "Duration", render: (r) => formatDuration(r.durationMinutes * 60) },
    { key: "pause", label: "Pause when", render: (r) => r.pauseStates || "—" },
    { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
    { key: "count", label: "Task SLAs", render: (r) => r._count.taskSlas },
  ];
  return <ListView title="SLA Definitions" basePath="/sla" newHref="/sla/new" rows={rows} total={rows.length} columns={columns}
    rowHref={(r) => `/sla/${r.id}`} params={params} page={lp.page} sort="name" dir="asc" />;
}
