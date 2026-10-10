import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/list";
import { parseVariables } from "@/lib/rules/catalog";
import { agentOptions, groupOptions } from "@/lib/refs";
import { ChoiceField, FormHeader, Grid, ReadOnly, RefField, Section, TextArea } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StateBadge } from "@/components/Badges";
import { Activity } from "@/components/Activity";
import { SlaPanel } from "@/components/SlaPanel";
import { addTaskAction, updateRitmAction } from "../../actions";

export default async function RitmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { id } = await params;
  const { error } = await searchParams;
  const r = await db.requestItem.findUnique({ where: { id }, include: { item: true, request: { include: { requestedFor: true } }, tasks: { include: { assignedTo: true } } } });
  if (!r) notFound();
  const [agents, groups, approvals] = await Promise.all([
    agentOptions(), groupOptions(),
    db.approval.findMany({ where: { table: "sc_req_item", recordId: id }, include: { approver: true } }),
  ]);
  const values = JSON.parse(r.variables || "{}") as Record<string, string>;
  return (
    <div className="card">
      <form action={updateRitmAction}>
        <input type="hidden" name="id" value={r.id} />
        <FormHeader title="Requested Item" number={r.number}>
          <StateBadge list="ritmStage" value={r.stage} />
          <button className="btn-primary">Update</button>
        </FormHeader>
        <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
        <Grid>
          <ReadOnly label="Item" value={r.item.name} />
          <ReadOnly label="Request" value={<Link className="link" href={`/sc/request/${r.requestId}`}>{r.request.number}</Link>} />
          <ReadOnly label="Requested for" value={`${r.request.requestedFor.firstName} ${r.request.requestedFor.lastName}`} />
          <ReadOnly label="Quantity" value={r.quantity} />
          <ChoiceField label="State" name="state" list="ritmState" value={r.state} />
          <ReadOnly label="Approval" value={<StateBadge list="approval" value={r.approval} />} />
          <RefField label="Assignment group" name="assignmentGroupId" options={groups} value={r.assignmentGroupId} />
          <RefField label="Assigned to" name="assignedToId" options={agents} value={r.assignedToId} />
          <TextArea label="Work notes" name="workNotes" rows={2} />
        </Grid>
      </form>
      <Section title="Variables">
        <Grid>
          {parseVariables(r.item.variables).map((v) => (
            <ReadOnly key={v.name} label={v.label} value={v.type === "checkbox" ? (values[v.name] ? "Yes" : "No") : values[v.name]} />
          ))}
        </Grid>
      </Section>
      <Section title="Approvers">
        <ul className="p-4 text-sm">
          {approvals.map((a) => <li key={a.id}>{a.approver.firstName} {a.approver.lastName} · <StateBadge list="approval" value={a.state} /> {a.comments && `“${a.comments}”`} {fmtDate(a.decidedAt)}</li>)}
          {approvals.length === 0 && <li className="text-gray-500">No approval required.</li>}
        </ul>
      </Section>
      <Section title="Catalog tasks">
        <div className="p-4">
          <table className="mb-3 w-full text-sm">
            <tbody>
              {r.tasks.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="py-1.5"><Link className="link" href={`/sc/task/${t.id}`}>{t.number}</Link></td>
                  <td>{t.shortDescription}</td>
                  <td><StateBadge list="ritmState" value={t.state} /></td>
                  <td>{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!r.state.startsWith("closed") && r.stage !== "waiting_for_approval" && (
            <form action={addTaskAction} className="flex gap-2">
              <input type="hidden" name="ritmId" value={r.id} />
              <input name="shortDescription" className="input w-80" placeholder="New task description" required />
              <button className="btn-secondary">Add task</button>
            </form>
          )}
        </div>
      </Section>
      <SlaPanel table="sc_req_item" recordId={r.id} />
      <Activity table="sc_req_item" recordId={r.id} path={`/sc/ritm/${r.id}`} agent />
    </div>
  );
}
