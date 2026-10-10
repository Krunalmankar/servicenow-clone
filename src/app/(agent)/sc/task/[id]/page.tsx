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
import { updateTaskAction } from "../../actions";

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { id } = await params;
  const { error } = await searchParams;
  const t = await db.catalogTask.findUnique({ where: { id }, include: { ritm: { include: { item: true, request: { include: { requestedFor: true } } } } } });
  if (!t) notFound();
  const [agents, groups] = await Promise.all([agentOptions(), groupOptions()]);
  const values = JSON.parse(t.ritm.variables || "{}") as Record<string, string>;
  return (
    <div className="card">
      <form action={updateTaskAction}>
        <input type="hidden" name="id" value={t.id} />
        <FormHeader title="Catalog Task" number={t.number}>
          <StateBadge list="ritmState" value={t.state} />
          <button className="btn-primary">Update</button>
        </FormHeader>
        <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
        <Grid>
          <ReadOnly label="Requested item" value={<Link className="link" href={`/sc/ritm/${t.ritmId}`}>{t.ritm.number} · {t.ritm.item.name}</Link>} />
          <ReadOnly label="Requested for" value={`${t.ritm.request.requestedFor.firstName} ${t.ritm.request.requestedFor.lastName}`} />
          <ChoiceField label="State" name="state" list="ritmState" value={t.state} />
          <ReadOnly label="Opened" value={fmtDate(t.openedAt)} />
          <RefField label="Assignment group" name="assignmentGroupId" options={groups} value={t.assignmentGroupId} />
          <RefField label="Assigned to" name="assignedToId" options={agents} value={t.assignedToId} />
          <ReadOnly label="Short description" value={t.shortDescription} full />
          <TextArea label="Work notes" name="workNotes" rows={2} />
        </Grid>
      </form>
      <Section title="Item variables">
        <Grid>
          {parseVariables(t.ritm.item.variables).map((v) => <ReadOnly key={v.name} label={v.label} value={v.type === "checkbox" ? (values[v.name] ? "Yes" : "No") : values[v.name]} />)}
        </Grid>
      </Section>
      <Activity table="sc_task" recordId={t.id} path={`/sc/task/${t.id}`} agent />
    </div>
  );
}
