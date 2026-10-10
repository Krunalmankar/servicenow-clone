import type { ChangeRequest } from "@prisma/client";
import { ChoiceField, Grid, ReadOnly, RefField, Section, TextArea, TextField } from "@/components/Form";
import { label } from "@/lib/choices";
import { fmtDate, toLocalInput } from "@/lib/list";
import { agentOptions, ciOptions, groupOptions } from "@/lib/refs";

export async function ChangeFields({ c }: { c?: ChangeRequest }) {
  const [agents, groups, cis] = await Promise.all([agentOptions(), groupOptions(), ciOptions()]);
  return (
    <>
      <Grid>
        <ReadOnly label="Number" value={c?.number ?? "(assigned on save)"} />
        <ReadOnly label="Approval" value={c ? label("approval", c.approval) : ""} />
        <ChoiceField label="Type" name="type" list="changeType" value={c?.type ?? "normal"} disabled={!!c} />
        {c && <input type="hidden" name="type" value={c.type} />}
        <ChoiceField label="State" name="state" list="changeState" value={c?.state ?? "new"} />
        <ChoiceField label="Category" name="category" list="changeCategory" value={c?.category ?? "software"} />
        <ChoiceField label="Risk" name="risk" list="changeRisk" value={c?.risk ?? "moderate"} />
        <RefField label="Configuration item" name="ciId" options={cis} value={c?.ciId} />
        <ChoiceField label="Impact" name="impact" list="impact" value={c?.impact ?? 3} />
        <RefField label="Assignment group" name="assignmentGroupId" options={groups} value={c?.assignmentGroupId} />
        <ChoiceField label="Priority" name="priority" list="priority" value={c?.priority ?? 4} />
        <RefField label="Assigned to" name="assignedToId" options={agents} value={c?.assignedToId} />
        <ReadOnly label="Opened" value={c ? fmtDate(c.openedAt) : ""} />
        <TextField label="Short description" name="shortDescription" defaultValue={c?.shortDescription} required full />
        <TextArea label="Description" name="description" rows={3} defaultValue={c?.description ?? ""} />
      </Grid>
      <Section title="Planning">
        <Grid>
          <TextArea label="Justification" name="justification" rows={2} defaultValue={c?.justification ?? ""} />
          <TextArea label="Implementation plan" name="implementationPlan" rows={3} defaultValue={c?.implementationPlan ?? ""} />
          <TextArea label="Risk and impact analysis" name="riskImpactAnalysis" rows={2} defaultValue={c?.riskImpactAnalysis ?? ""} />
          <TextArea label="Backout plan" name="backoutPlan" rows={2} defaultValue={c?.backoutPlan ?? ""} />
          <TextArea label="Test plan" name="testPlan" rows={2} defaultValue={c?.testPlan ?? ""} />
        </Grid>
      </Section>
      <Section title="Schedule (UTC)">
        <Grid>
          <TextField label="Planned start" name="plannedStart" type="datetime-local" defaultValue={toLocalInput(c?.plannedStart)} />
          <TextField label="Planned end" name="plannedEnd" type="datetime-local" defaultValue={toLocalInput(c?.plannedEnd)} />
          {c && <ReadOnly label="Actual start" value={fmtDate(c.actualStart)} />}
          {c && <ReadOnly label="Actual end" value={fmtDate(c.actualEnd)} />}
        </Grid>
      </Section>
      {c && (
        <Section title="Closure information">
          <Grid>
            <ChoiceField label="Close code" name="closeCode" list="changeCloseCode" value={c.closeCode} allowEmpty />
            <ReadOnly label="Closed" value={fmtDate(c.closedAt)} />
            <TextArea label="Close notes" name="closeNotes" rows={2} defaultValue={c.closeNotes ?? ""} />
            <TextArea label="Work notes" name="workNotes" rows={2} />
          </Grid>
        </Section>
      )}
    </>
  );
}
