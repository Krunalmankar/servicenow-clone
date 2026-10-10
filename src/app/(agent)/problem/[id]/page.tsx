import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { FormHeader, Section } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PriorityBadge, StateBadge } from "@/components/Badges";
import { Activity } from "@/components/Activity";
import { SlaPanel } from "@/components/SlaPanel";
import { linkIncidentAction, updateProblemAction } from "../actions";
import { ProblemFields } from "../ProblemForm";

export default async function ProblemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { id } = await params;
  const { error } = await searchParams;
  const p = await db.problem.findUnique({ where: { id }, include: { incidents: { include: { caller: true }, orderBy: { number: "desc" } } } });
  if (!p) notFound();
  return (
    <div className="card">
      <form action={updateProblemAction}>
        <input type="hidden" name="id" value={p.id} />
        <FormHeader title="Problem" number={p.number}>
          {p.knownError && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">Known Error</span>}
          <PriorityBadge value={p.priority} />
          <StateBadge list="problemState" value={p.state} />
          <button className="btn-primary">Update</button>
        </FormHeader>
        <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
        <ProblemFields p={p} />
      </form>
      <Section title={`Related incidents (${p.incidents.length})`}>
        <div className="p-4">
          <table className="mb-3 w-full text-sm">
            <tbody>
              {p.incidents.map((i) => (
                <tr key={i.id} className="border-b border-gray-100">
                  <td className="py-1.5"><Link className="link" href={`/incident/${i.id}`}>{i.number}</Link></td>
                  <td>{i.shortDescription}</td>
                  <td>{i.caller.firstName} {i.caller.lastName}</td>
                  <td><PriorityBadge value={i.priority} /></td>
                  <td><StateBadge list="incidentState" value={i.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action={linkIncidentAction} className="flex gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input name="incidentNumber" placeholder="INC0010001" className="input w-48" required />
            <button className="btn-secondary">Link incident</button>
          </form>
        </div>
      </Section>
      <SlaPanel table="problem" recordId={p.id} />
      <Activity table="problem" recordId={p.id} path={`/problem/${p.id}`} agent />
    </div>
  );
}
