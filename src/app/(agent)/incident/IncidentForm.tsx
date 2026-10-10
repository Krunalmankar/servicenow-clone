import type { Incident } from "@prisma/client";
import { ChoiceField, Grid, ReadOnly, RefField, Section, TextArea, TextField } from "@/components/Form";
import { label } from "@/lib/choices";
import { fmtDate } from "@/lib/list";
import { agentOptions, changeOptions, ciOptions, groupOptions, problemOptions, userOptions } from "@/lib/refs";

/** Shared incident form body for new and existing records. */
export async function IncidentFields({ inc, defaultCallerId }: { inc?: Incident; defaultCallerId: string }) {
  const [users, agents, groups, cis, problems, changes] = await Promise.all([
    userOptions(), agentOptions(), groupOptions(), ciOptions(), problemOptions(), changeOptions(),
  ]);
  return (
    <>
      <Grid>
        <ReadOnly label="Number" value={inc?.number ?? "(assigned on save)"} />
        <ReadOnly label="Opened" value={inc ? fmtDate(inc.openedAt) : ""} />
        <RefField label="Caller" name="callerId" options={users} value={inc?.callerId ?? defaultCallerId} required />
        <ChoiceField label="State" name="state" list="incidentState" value={inc?.state ?? "new"} />
        <ChoiceField label="Category" name="category" list="incidentCategory" value={inc?.category} />
        <ChoiceField label="On hold reason" name="onHoldReason" list="onHoldReason" value={inc?.onHoldReason} allowEmpty />
        <TextField label="Subcategory" name="subcategory" defaultValue={inc?.subcategory ?? ""} />
        <ChoiceField label="Impact" name="impact" list="impact" value={inc?.impact ?? 3} />
        <RefField label="Configuration item" name="ciId" options={cis} value={inc?.ciId} />
        <ChoiceField label="Urgency" name="urgency" list="urgency" value={inc?.urgency ?? 3} />
        <ChoiceField label="Channel" name="contactType" list="contactType" value={inc?.contactType ?? "phone"} />
        <ReadOnly label="Priority" value={inc ? label("priority", inc.priority) : "Calculated from impact and urgency"} />
        <RefField label="Assignment group" name="assignmentGroupId" options={groups} value={inc?.assignmentGroupId} />
        <RefField label="Assigned to" name="assignedToId" options={agents} value={inc?.assignedToId} />
        <TextField label="Short description" name="shortDescription" defaultValue={inc?.shortDescription} required full />
        <TextArea label="Description" name="description" defaultValue={inc?.description ?? ""} />
      </Grid>
      <Section title="Related records">
        <Grid>
          <RefField label="Problem" name="problemId" options={problems} value={inc?.problemId} />
          <RefField label="Caused by change" name="changeId" options={changes} value={inc?.changeId} />
        </Grid>
      </Section>
      <Section title="Resolution information">
        <Grid>
          <ChoiceField label="Resolution code" name="resolutionCode" list="resolutionCode" value={inc?.resolutionCode} allowEmpty />
          <ReadOnly label="Resolved" value={inc ? fmtDate(inc.resolvedAt) : ""} />
          <TextArea label="Resolution notes" name="resolutionNotes" rows={3} defaultValue={inc?.resolutionNotes ?? ""} />
        </Grid>
      </Section>
      <Section title="Notes">
        <Grid>
          <TextArea label="Work notes" name="workNotes" rows={2} placeholder="Internal, visible to agents only" />
          {inc && <TextArea label="Additional comments" name="comments" rows={2} placeholder="Visible to the caller" />}
        </Grid>
      </Section>
    </>
  );
}
