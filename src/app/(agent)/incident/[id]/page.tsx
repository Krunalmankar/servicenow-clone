import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DefaultSubmit, FormHeader } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PriorityBadge, StateBadge } from "@/components/Badges";
import { Activity } from "@/components/Activity";
import { SlaPanel } from "@/components/SlaPanel";
import { assignToMeAction, createProblemFromIncident, updateIncidentAction } from "../actions";
import { IncidentFields } from "../IncidentForm";

export default async function IncidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("itil");
  const { id } = await params;
  const { error } = await searchParams;
  const inc = await db.incident.findUnique({ where: { id }, include: { caller: true, ci: true, problem: true } });
  if (!inc) notFound();

  return (
    <div className="card">
      <form action={updateIncidentAction}>
        <input type="hidden" name="id" value={inc.id} />
        <DefaultSubmit />
        <FormHeader title="Incident" number={inc.number}>
          <PriorityBadge value={inc.priority} />
          <StateBadge list="incidentState" value={inc.state} />
          {inc.assignedToId !== user.id && <button formAction={assignToMeAction} className="btn-secondary">Assign to me</button>}
          {!inc.problemId && <button formAction={createProblemFromIncident} className="btn-secondary">Create Problem</button>}
          <button className="btn-primary">Update</button>
        </FormHeader>
        <div className="px-4 pt-3">
          <ErrorBanner error={error} />
          <div className="text-xs text-gray-500">
            Caller: <b>{inc.caller.firstName} {inc.caller.lastName}</b> ({inc.caller.email})
            {inc.ci && <> · CI: <Link className="link" href={`/cmdb/${inc.ci.id}`}>{inc.ci.name}</Link></>}
            {inc.problem && <> · Problem: <Link className="link" href={`/problem/${inc.problem.id}`}>{inc.problem.number}</Link></>}
            {" "}· Reassigned {inc.reassignmentCount}× · Reopened {inc.reopenCount}×
          </div>
        </div>
        <IncidentFields inc={inc} defaultCallerId={user.id} />
      </form>
      <SlaPanel table="incident" recordId={inc.id} />
      <Activity table="incident" recordId={inc.id} path={`/incident/${inc.id}`} agent />
    </div>
  );
}
