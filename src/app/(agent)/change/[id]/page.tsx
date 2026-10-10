import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";
import { findConflicts } from "@/lib/rules/change";
import { DefaultSubmit, FormHeader, Section } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StateBadge } from "@/components/Badges";
import { Activity } from "@/components/Activity";
import { transitionChangeAction, updateChangeAction } from "../actions";
import { ChangeFields } from "../ChangeForm";

const NEXT: Record<string, [string, string][]> = {
  new: [["assess", "Assess"], ["authorize", "Request Approval"]],
  assess: [["authorize", "Request Approval"]],
  authorize: [],
  scheduled: [["implement", "Implement"]],
  implement: [["review", "Review"]],
  review: [["closed", "Close"]],
};

export default async function ChangePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { id } = await params;
  const { error } = await searchParams;
  const c = await db.changeRequest.findUnique({ where: { id }, include: { requestedBy: true, ci: true, incidentsCaused: true } });
  if (!c) notFound();
  const [approvals, conflicts] = await Promise.all([
    db.approval.findMany({ where: { table: "change_request", recordId: id }, include: { approver: true }, orderBy: { createdAt: "asc" } }),
    findConflicts(c),
  ]);
  const transitions = (NEXT[c.state] ?? []).filter(([s]) => !(c.type === "standard" && s === "authorize"));
  if (c.type === "standard" && (c.state === "new" || c.state === "assess")) transitions.push(["scheduled", "Schedule"]);

  return (
    <div className="card">
      <form action={updateChangeAction}>
        <input type="hidden" name="id" value={c.id} />
        <DefaultSubmit />
        <FormHeader title={`${label("changeType", c.type)} Change`} number={c.number}>
          <StateBadge list="changeState" value={c.state} />
          <StateBadge list="approval" value={c.approval} />
          {transitions.map(([s, l]) => <button key={s} formAction={transitionChangeAction.bind(null, s)} className="btn-secondary">{l}</button>)}
          {!["closed", "canceled"].includes(c.state) && <button formAction={transitionChangeAction.bind(null, "canceled")} className="btn-secondary">Cancel change</button>}
          <button className="btn-primary">Update</button>
        </FormHeader>
        <div className="px-4 pt-3">
          <ErrorBanner error={error} />
          {conflicts.length > 0 && (
            <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Schedule conflict on {c.ci?.name}: {conflicts.map((x) => <Link key={x.id} href={`/change/${x.id}`} className="link mr-2">{x.number}</Link>)}
            </div>
          )}
          <div className="text-xs text-gray-500">Requested by {c.requestedBy.firstName} {c.requestedBy.lastName}</div>
        </div>
        <ChangeFields c={c} />
      </form>
      <Section title="Approvers">
        <table className="m-4 w-[calc(100%-2rem)] text-sm">
          <thead className="text-left text-xs uppercase text-gray-500"><tr><th>Approver</th><th>State</th><th>Comments</th><th>Decided</th></tr></thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="py-1.5">{a.approver.firstName} {a.approver.lastName}</td>
                <td><StateBadge list="approval" value={a.state} /></td>
                <td>{a.comments}</td>
                <td>{fmtDate(a.decidedAt)}</td>
              </tr>
            ))}
            {approvals.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-500">No approvals requested.</td></tr>}
          </tbody>
        </table>
      </Section>
      {c.incidentsCaused.length > 0 && (
        <Section title="Incidents caused by this change">
          <ul className="p-4 text-sm">{c.incidentsCaused.map((i) => <li key={i.id}><Link className="link" href={`/incident/${i.id}`}>{i.number}</Link> {i.shortDescription}</li>)}</ul>
        </Section>
      )}
      <Activity table="change_request" recordId={c.id} path={`/change/${c.id}`} agent />
    </div>
  );
}
