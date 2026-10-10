// Small, dependency-free charts for dashboards. Single-series, so one hue; values at the bar tip;
// native tooltips on every mark. Colours follow the dataviz reference palette (series-1 blue).
import Link from "next/link";

const SERIES = "#2a78d6";

type Bar = { label: string; value: number; href?: string };

/** Horizontal bar chart: magnitude per category. */
export function BarList({ data, unit = "" }: { data: Bar[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2" role="list">
      {data.map((d) => {
        const row = (
          <div className="grid grid-cols-[8.5rem_1fr] items-center gap-3 text-sm" title={`${d.label}: ${d.value}${unit}`}>
            <span className="truncate text-gray-700">{d.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-4 rounded-r-[4px]"
                style={{ width: `${Math.max(d.value ? 2 : 0, (d.value / max) * 85)}%`, background: SERIES }}
              />
              <span className="text-xs tabular-nums text-gray-600">{d.value}{unit}</span>
            </span>
          </div>
        );
        return <li key={d.label}>{d.href ? <Link href={d.href} className="block rounded hover:bg-gray-50">{row}</Link> : row}</li>;
      })}
      {data.length === 0 && <li className="text-sm text-gray-500">No data</li>}
    </ul>
  );
}

/** Column chart for a short time series (e.g. records per day). */
export function Columns({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [0, Math.ceil(max / 2), max];
  return (
    <div className="flex gap-2">
      <div className="flex flex-col-reverse justify-between pb-5 text-right text-[10px] tabular-nums text-gray-400" style={{ height: height + 20 }}>
        {ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="flex flex-1 items-end gap-[2px] border-b border-gray-200" style={{ height: height + 20 }}>
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.value}`}>
            <span className="mb-0.5 text-[10px] tabular-nums text-gray-600 opacity-0 group-hover:opacity-100">{d.value}</span>
            <span className="w-full max-w-6 rounded-t-[4px] group-hover:opacity-80" style={{ height: `${(d.value / max) * height}px`, background: SERIES }} />
            <span className="mt-1 h-4 text-[10px] text-gray-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatTile({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: "critical" | "warning" }) {
  const icon = tone === "critical" ? "▲" : tone === "warning" ? "●" : null;
  const iconColor = tone === "critical" ? "#d03b3b" : "#fab219";
  const body = (
    <div className="card h-full p-4 transition-colors hover:border-sn-accent">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2 text-3xl font-semibold tabular-nums text-gray-900">
        {value}
        {icon && Number(value) > 0 && <span className="text-sm" style={{ color: iconColor }} aria-label={tone}>{icon}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
