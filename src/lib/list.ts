export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 20;

export function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Common list params: free-text query, quick filter, sort, paging. */
export function listParams(params: SearchParams, defaultSort = "number", defaultDir: "asc" | "desc" = "desc") {
  const page = Math.max(1, parseInt(sp(params, "page") ?? "1", 10) || 1);
  return {
    q: sp(params, "q")?.trim() || "",
    filter: sp(params, "filter") || "",
    sort: sp(params, "sort") || defaultSort,
    dir: (sp(params, "dir") === "asc" ? "asc" : sp(params, "dir") === "desc" ? "desc" : defaultDir) as "asc" | "desc",
    page,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };
}

export function qs(base: SearchParams, patch: Record<string, string | number | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && val !== "") out.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") out.delete(k);
    else out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 16).replace("T", " ");
}

/** Value for <input type="datetime-local">. */
export function toLocalInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 16) : "";
}

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export function optDate(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v.length === 16 ? `${v}:00Z` : v);
  return isNaN(d.getTime()) ? null : d;
}

export function num(fd: FormData, key: string, fallback: number): number {
  const n = parseInt(str(fd, key), 10);
  return isNaN(n) ? fallback : n;
}
