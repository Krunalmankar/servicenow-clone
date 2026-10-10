import type { Problem } from "@prisma/client";
import { ChoiceField, Field, Grid, ReadOnly, RefField, Section, TextArea, TextField } from "@/components/Form";
import { label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";
import { agentOptions, ciOptions, groupOptions } from "@/lib/refs";

export async function ProblemFields({ p }: { p?: Problem }) {
  const [agents, groups, cis] = await Promise.all([agentOptions(), groupOptions(), ciOptions()]);
  return (
    <>
      <Grid>
        <ReadOnly label="Number" value={p?.number ?? "(assigned on save)"} />
        <ReadOnly label="Opened" value={p ? fmtDate(p.openedAt) : ""} />
        <ChoiceField label="Category" name="category" list="changeCategory" value={p?.category ?? "software"} />
        <ChoiceField label="State" name="state" list="problemState" value={p?.state ?? "new"} />
        <RefField label="Configuration item" name="ciId" options={cis} value={p?.ciId} />
        <ChoiceField label="Impact" name="impact" list="impact" value={p?.impact ?? 3} />
        <RefField label="Assignment group" name="assignmentGroupId" options={groups} value={p?.assignmentGroupId} />
        <ChoiceField label="Urgency" name="urgency" list="urgency" value={p?.urgency ?? 3} />
        <RefField label="Assigned to" name="assignedToId" options={agents} value={p?.assignedToId} />
        <ReadOnly label="Priority" value={p ? label("priority", p.priority) : "Calculated"} />
        <TextField label="Problem statement" name="shortDescription" defaultValue={p?.shortDescription} required full />
        <TextArea label="Description" name="description" defaultValue={p?.description ?? ""} />
      </Grid>
      <Section title="Analysis information">
        <Grid>
          <TextArea label="Workaround" name="workaround" rows={3} defaultValue={p?.workaround ?? ""} />
          <TextArea label="Cause notes" name="rootCause" rows={3} defaultValue={p?.rootCause ?? ""} />
          <TextArea label="Fix notes" name="fix" rows={3} defaultValue={p?.fix ?? ""} />
          <Field label="Known error">
            <input type="checkbox" name="knownError" defaultChecked={p?.knownError} className="mt-2 h-4 w-4" />
          </Field>
        </Grid>
      </Section>
      <Section title="Resolution">
        <Grid>
          <ChoiceField label="Resolution code" name="resolutionCode" list="problemResolution" value={p?.resolutionCode} allowEmpty />
          <ReadOnly label="Resolved" value={p ? fmtDate(p.resolvedAt) : ""} />
          {p && <TextArea label="Work notes" name="workNotes" rows={2} />}
        </Grid>
      </Section>
    </>
  );
}
