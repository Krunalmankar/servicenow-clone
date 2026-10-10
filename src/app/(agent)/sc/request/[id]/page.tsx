import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/list";
import { FormHeader, Grid, ReadOnly, Section } from "@/components/Form";
import { StateBadge } from "@/components/Badges";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("itil");
  const { id } = await params;
  const r = await db.request.findUnique({ where: { id }, include: { requestedFor: true, requestedBy: true, items: { include: { item: true } } } });
  if (!r) notFound();
  return (
    <div className="card">
      <FormHeader title="Request" number={r.number}><StateBadge list="requestState" value={r.state} /><StateBadge list="approval" value={r.approval} /></FormHeader>
      <Grid>
        <ReadOnly label="Requested for" value={`${r.requestedFor.firstName} ${r.requestedFor.lastName}`} />
        <ReadOnly label="Opened" value={fmtDate(r.openedAt)} />
        <ReadOnly label="Requested by" value={`${r.requestedBy.firstName} ${r.requestedBy.lastName}`} />
        <ReadOnly label="Due date" value={fmtDate(r.dueDate)} />
        <ReadOnly label="Special instructions" value={r.specialInstructions} full />
      </Grid>
      <Section title="Requested items">
        <table className="m-4 w-[calc(100%-2rem)] text-sm">
          <tbody>
            {r.items.map((i) => (
              <tr key={i.id} className="border-b border-gray-100">
                <td className="py-1.5"><Link className="link" href={`/sc/ritm/${i.id}`}>{i.number}</Link></td>
                <td>{i.item.name} ×{i.quantity}</td>
                <td><StateBadge list="ritmStage" value={i.stage} /></td>
                <td><StateBadge list="ritmState" value={i.state} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
