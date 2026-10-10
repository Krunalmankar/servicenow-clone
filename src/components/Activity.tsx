import { db } from "@/lib/db";
import { fmtDate } from "@/lib/list";
import { postJournal } from "@/lib/journal-actions";

type Props = { table: string; recordId: string; path: string; agent: boolean; showAudit?: boolean };

/** Activity stream: work notes, comments and field changes, newest first. */
export async function Activity({ table, recordId, path, agent, showAudit = true }: Props) {
  const [journal, audit] = await Promise.all([
    db.journalEntry.findMany({
      where: { table, recordId, ...(agent ? {} : { type: "comments" }) },
      include: { author: true },
    }),
    showAudit && agent ? db.auditLog.findMany({ where: { table, recordId } }) : Promise.resolve([]),
  ]);

  type Item = { key: string; at: Date; who: string; kind: "work_notes" | "comments" | "audit"; body: React.ReactNode };
  const items: Item[] = [
    ...journal.map((j) => ({
      key: j.id, at: j.createdAt, who: `${j.author.firstName} ${j.author.lastName}`,
      kind: j.type as "work_notes" | "comments", body: <p className="whitespace-pre-wrap">{j.body}</p>,
    })),
  ];
  // Group audit rows written in the same save into one entry.
  const byTxn = new Map<string, typeof audit>();
  for (const a of audit) {
    const k = `${a.userId}|${Math.floor(a.createdAt.getTime() / 2000)}`;
    byTxn.set(k, [...(byTxn.get(k) ?? []), a]);
  }
  for (const [k, rows] of byTxn) {
    items.push({
      key: k, at: rows[0].createdAt, who: rows[0].userName ?? "System", kind: "audit",
      body: (
        <ul className="space-y-0.5">
          {rows.map((r) => (
            <li key={r.id}><span className="font-medium">{r.field}</span>: {r.oldValue ? <><s className="text-gray-400">{r.oldValue}</s> → </> : null}{r.newValue ?? <i>empty</i>}</li>
          ))}
        </ul>
      ),
    });
  }
  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  const tone = { work_notes: "border-amber-400 bg-amber-50", comments: "border-sky-400 bg-sky-50", audit: "border-gray-300 bg-gray-50" };
  const title = { work_notes: "Work notes", comments: "Additional comments", audit: "Field changes" };

  return (
    <div className="border-t border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Activity</h3>
      <form action={postJournal} className="mb-4 space-y-2">
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="recordId" value={recordId} />
        <input type="hidden" name="path" value={path} />
        <textarea name="body" rows={3} className="input" placeholder={agent ? "Add a work note or customer-visible comment" : "Add a comment"} required />
        <div className="flex items-center gap-3 text-sm">
          {agent ? (
            <select name="type" className="input w-auto">
              <option value="work_notes">Work notes (internal)</option>
              <option value="comments">Additional comments (customer visible)</option>
            </select>
          ) : <input type="hidden" name="type" value="comments" />}
          <button className="btn-primary">Post</button>
        </div>
      </form>
      <ol className="space-y-3">
        {items.map((i) => (
          <li key={i.key} className={`rounded border-l-4 px-3 py-2 text-sm ${tone[i.kind]}`}>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span><b className="text-gray-700">{i.who}</b> · {title[i.kind]}</span>
              <span>{fmtDate(i.at)}</span>
            </div>
            {i.body}
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-gray-500">No activity yet.</li>}
      </ol>
    </div>
  );
}
