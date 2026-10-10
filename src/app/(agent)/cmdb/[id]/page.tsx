import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { label, ACTIVE_INCIDENT_STATES, ACTIVE_CHANGE_STATES, CHOICES } from "@/lib/choices";
import { ciOptions, groupOptions, userOptions } from "@/lib/refs";
import { ChoiceField, FormHeader, Grid, RefField, Section, TextArea, TextField } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PriorityBadge, StateBadge } from "@/components/Badges";
import { addRelAction, removeRelAction, saveCiAction } from "../actions";

const REL_NAMES = Object.fromEntries(CHOICES.relType.map((r) => [r.value, r.label.split(" :: ")]));

/** Walks "up" the relationship graph to find business services that depend on this CI. */
async function impactedServices(ciId: string) {
  const seen = new Set<string>([ciId]);
  let frontier = [ciId];
  const services = new Map<string, string>();
  while (frontier.length) {
    const rels = await db.ciRelationship.findMany({ where: { childId: { in: frontier } }, include: { parent: true } });
    frontier = [];
    for (const r of rels) {
      if (seen.has(r.parentId)) continue;
      seen.add(r.parentId);
      frontier.push(r.parentId);
      if (r.parent.ciClass === "business_service") services.set(r.parent.id, r.parent.name);
    }
  }
  return [...services].map(([id, name]) => ({ id, name }));
}

export default async function CiPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil", "cmdb_admin");
  const { id } = await params;
  const { error } = await searchParams;
  const ci = id === "new" ? null : await db.configurationItem.findUnique({
    where: { id },
    include: { parentRels: { include: { child: true } }, childRels: { include: { parent: true } } },
  });
  if (id !== "new" && !ci) notFound();
  const [users, groups, cis] = await Promise.all([userOptions(), groupOptions(), ciOptions()]);
  const [incidents, changes, services] = ci ? await Promise.all([
    db.incident.findMany({ where: { ciId: ci.id, state: { in: ACTIVE_INCIDENT_STATES } }, orderBy: { priority: "asc" } }),
    db.changeRequest.findMany({ where: { ciId: ci.id, state: { in: ACTIVE_CHANGE_STATES } } }),
    impactedServices(ci.id),
  ]) : [[], [], []];

  return (
    <div className="card">
      <form action={saveCiAction}>
        <input type="hidden" name="id" value={ci?.id ?? ""} />
        <FormHeader title={ci ? label("ciClass", ci.ciClass) : "Configuration Item"} number={ci?.name}>
          {ci && <StateBadge list="ciStatus" value={ci.status} />}
          <button className="btn-primary">{ci ? "Update" : "Submit"}</button>
        </FormHeader>
        <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
        <Grid>
          <TextField label="Name" name="name" defaultValue={ci?.name} required />
          <ChoiceField label="Class" name="ciClass" list="ciClass" value={ci?.ciClass ?? "server"} />
          <ChoiceField label="Status" name="status" list="ciStatus" value={ci?.status ?? "operational"} />
          <ChoiceField label="Environment" name="environment" list="environment" value={ci?.environment ?? "production"} />
          <ChoiceField label="Business criticality" name="criticality" list="criticality" value={ci?.criticality ?? "3"} />
          <TextField label="IP address" name="ipAddress" defaultValue={ci?.ipAddress ?? ""} />
          <TextField label="FQDN" name="fqdn" defaultValue={ci?.fqdn ?? ""} />
          <TextField label="OS / Platform" name="os" defaultValue={ci?.os ?? ""} />
          <TextField label="Version" name="version" defaultValue={ci?.version ?? ""} />
          <TextField label="Manufacturer" name="manufacturer" defaultValue={ci?.manufacturer ?? ""} />
          <TextField label="Serial number" name="serialNumber" defaultValue={ci?.serialNumber ?? ""} />
          <TextField label="Location" name="location" defaultValue={ci?.location ?? ""} />
          <RefField label="Owned by" name="ownedById" options={users} value={ci?.ownedById} />
          <RefField label="Support group" name="supportGroupId" options={groups} value={ci?.supportGroupId} />
          <TextArea label="Description" name="description" rows={2} defaultValue={ci?.description ?? ""} />
        </Grid>
      </form>
      {ci && (
        <>
          <Section title="Relationships">
            <div className="grid gap-6 p-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Upstream (depends on this)</h4>
                <ul className="space-y-1 text-sm">
                  {ci.childRels.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <Link className="link" href={`/cmdb/${r.parent.id}`}>{r.parent.name}</Link>
                      <span className="text-gray-500">{REL_NAMES[r.type]?.[0].toLowerCase()} this</span>
                      <form action={removeRelAction} className="ml-auto"><input type="hidden" name="id" value={ci.id} /><input type="hidden" name="relId" value={r.id} /><button className="text-xs text-red-600 hover:underline">remove</button></form>
                    </li>
                  ))}
                  {ci.childRels.length === 0 && <li className="text-gray-500">None</li>}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Downstream (this depends on)</h4>
                <ul className="space-y-1 text-sm">
                  {ci.parentRels.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="text-gray-500">{REL_NAMES[r.type]?.[0]}</span>
                      <Link className="link" href={`/cmdb/${r.child.id}`}>{r.child.name}</Link>
                      <form action={removeRelAction} className="ml-auto"><input type="hidden" name="id" value={ci.id} /><input type="hidden" name="relId" value={r.id} /><button className="text-xs text-red-600 hover:underline">remove</button></form>
                    </li>
                  ))}
                  {ci.parentRels.length === 0 && <li className="text-gray-500">None</li>}
                </ul>
              </div>
            </div>
            <form action={addRelAction} className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm">
              <input type="hidden" name="id" value={ci.id} />
              <span>This CI</span>
              <select name="type" className="input w-auto">{CHOICES.relType.map((r) => <option key={r.value} value={r.value}>{r.label.split(" :: ")[0]}</option>)}</select>
              <select name="otherId" className="input w-56" required><option value="">Select CI…</option>{cis.filter((x) => x.id !== ci.id).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
              <input type="hidden" name="direction" value="child" />
              <button className="btn-secondary">Add relationship</button>
            </form>
          </Section>
          <Section title="Impact">
            <div className="grid gap-6 p-4 text-sm md:grid-cols-3">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Impacted business services</h4>
                {services.length ? services.map((s) => <div key={s.id}><Link className="link" href={`/cmdb/${s.id}`}>{s.name}</Link></div>) : <span className="text-gray-500">None</span>}
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Open incidents</h4>
                {incidents.length ? incidents.map((i) => <div key={i.id} className="flex gap-2"><Link className="link" href={`/incident/${i.id}`}>{i.number}</Link><PriorityBadge value={i.priority} /></div>) : <span className="text-gray-500">None</span>}
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Open changes</h4>
                {changes.length ? changes.map((c) => <div key={c.id}><Link className="link" href={`/change/${c.id}`}>{c.number}</Link> {label("changeState", c.state)}</div>) : <span className="text-gray-500">None</span>}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
