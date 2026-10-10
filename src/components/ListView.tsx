import Link from "next/link";
import { PAGE_SIZE, qs, type SearchParams } from "@/lib/list";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  title: string;
  basePath: string;
  rows: T[];
  total: number;
  columns: Column<T>[];
  rowHref: (row: T) => string;
  params: SearchParams;
  page: number;
  sort: string;
  dir: "asc" | "desc";
  newHref?: string;
  filters?: { value: string; label: string }[];
  activeFilter?: string;
  searchPlaceholder?: string;
};

/** Generic list view: search, quick filters, sortable columns, paging. */
export function ListView<T extends { id: string }>(p: Props<T>) {
  const pages = Math.max(1, Math.ceil(p.total / PAGE_SIZE));
  const first = p.total === 0 ? 0 : (p.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(p.total, p.page * PAGE_SIZE);
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-sn-dark">{p.title}</h1>
        {p.newHref && <Link href={p.newHref} className="btn-primary">New</Link>}
        <form className="ml-auto flex gap-2" action={p.basePath}>
          {p.activeFilter && <input type="hidden" name="filter" value={p.activeFilter} />}
          <input name="q" defaultValue={String(p.params.q ?? "")} placeholder={p.searchPlaceholder ?? "Search"} className="input w-64" />
          <button className="btn-secondary">Search</button>
        </form>
      </div>
      {p.filters && (
        <div className="flex flex-wrap gap-1 border-b border-gray-100 px-4 py-2 text-sm">
          {p.filters.map((f) => (
            <Link
              key={f.value}
              href={`${p.basePath}${qs(p.params, { filter: f.value, page: undefined })}`}
              className={`rounded px-2 py-1 ${(p.activeFilter ?? "") === f.value ? "bg-sn-dark text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              {p.columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-2 font-semibold">
                  {c.sortable ? (
                    <Link
                      href={`${p.basePath}${qs(p.params, { sort: c.key, dir: p.sort === c.key && p.dir === "asc" ? "desc" : "asc" })}`}
                      className="hover:text-sn-dark"
                    >
                      {c.label} {p.sort === c.key ? (p.dir === "asc" ? "▲" : "▼") : ""}
                    </Link>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-sn-accent/10">
                {p.columns.map((c, i) => (
                  <td key={c.key} className={`px-4 py-2 align-top ${c.key === "shortDescription" || c.key === "title" ? "" : "whitespace-nowrap"}`}>
                    {i === 0 ? <Link href={p.rowHref(row)} className="link font-medium">{c.render(row)}</Link> : c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {p.rows.length === 0 && (
              <tr><td colSpan={p.columns.length} className="px-4 py-10 text-center text-gray-500">No records to display</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <span>{first} to {last} of {p.total}</span>
        <div className="flex gap-2">
          {p.page > 1 && <Link className="btn-secondary" href={`${p.basePath}${qs(p.params, { page: p.page - 1 })}`}>Previous</Link>}
          {p.page < pages && <Link className="btn-secondary" href={`${p.basePath}${qs(p.params, { page: p.page + 1 })}`}>Next</Link>}
        </div>
      </div>
    </div>
  );
}
