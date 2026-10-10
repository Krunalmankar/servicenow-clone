import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/list";
import { decideAction } from "@/app/(agent)/approvals/actions";
import { StateBadge } from "./Badges";
import { NoImplicitSubmit } from "./Form";

/** Approvals assigned to a user with approve/reject controls. Used by the agent view and the portal. */
export async function ApprovalList({ userId, back, linkRecords }: { userId: string; back: string; linkRecords: boolean }) {
  const approvals = await db.approval.findMany({ where: { approverId: userId }, orderBy: [{ state: "desc" }, { createdAt: "desc" }], take: 50 });
  const changeIds = approvals.filter((a) => a.table === "change_request").map((a) => a.recordId);
  const ritmIds = approvals.filter((a) => a.table === "sc_req_item").map((a) => a.recordId);
  const [changes, ritms] = await Promise.all([
    db.changeRequest.findMany({ where: { id: { in: changeIds } }, include: { requestedBy: true } }),
    db.requestItem.findMany({ where: { id: { in: ritmIds } }, include: { item: true, request: { include: { requestedFor: true } } } }),
  ]);
  const describe = (table: string, id: string) => {
    if (table === "change_request") {
      const c = changes.find((x) => x.id === id);
      return c && { number: c.number, href: `/change/${c.id}`, text: c.shortDescription, who: `${c.requestedBy.firstName} ${c.requestedBy.lastName}` };
    }
    const r = ritms.find((x) => x.id === id);
    if (!r) return undefined;
    let vars: Record<string, unknown> = {};
    try { vars = JSON.parse(r.variables); } catch { /* ignore */ }
    return {
      number: r.number, href: linkRecords ? `/sc/ritm/${r.id}` : `/portal/requests`,
      text: `${r.item.name} ×${r.quantity} (${r.item.price ? `$${r.item.price * r.quantity}` : "no cost"}) ${Object.values(vars).filter(Boolean).join(" · ")}`,
      who: `${r.request.requestedFor.firstName} ${r.request.requestedFor.lastName}`,
    };
  };
  return (
    <div className="space-y-3">
      {approvals.map((a) => {
        const d = describe(a.table, a.recordId);
        if (!d) return null;
        return (
          <div key={a.id} className="card flex flex-wrap items-start gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm"><Link href={d.href} className="link font-semibold">{d.number}</Link> <StateBadge list="approval" value={a.state} /></div>
              <div className="mt-1 text-sm">{d.text}</div>
              <div className="mt-1 text-xs text-gray-500">Requested for {d.who} · {fmtDate(a.createdAt)}{a.comments ? ` · “${a.comments}”` : ""}</div>
            </div>
            {a.state === "requested" && (
              <form className="flex items-center gap-2">
                <NoImplicitSubmit />
                <input type="hidden" name="approvalId" value={a.id} />
                <input type="hidden" name="back" value={back} />
                <input name="comments" placeholder="Comments (required to reject)" className="input w-64" />
                <button formAction={decideAction.bind(null, "approved")} className="btn-success">Approve</button>
                <button formAction={decideAction.bind(null, "rejected")} className="btn-danger">Reject</button>
              </form>
            )}
          </div>
        );
      })}
      {approvals.length === 0 && <div className="card p-6 text-sm text-gray-500">You have no approvals.</div>}
    </div>
  );
}
