import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { CHOICES } from "@/lib/choices";
import { ChoiceField, Field, FormHeader, Grid, TextField } from "@/components/Form";
import { ErrorBanner, InfoBanner } from "@/components/ErrorBanner";
import { saveSlaAction } from "../actions";

export default async function SlaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const { error } = await searchParams;
  const s = id === "new" ? null : await db.slaDefinition.findUnique({ where: { id } });
  if (id !== "new" && !s) notFound();
  const cond = s ? (JSON.parse(s.condition) as Record<string, string[]>) : {};
  return (
    <form action={saveSlaAction} className="card">
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <FormHeader title="SLA Definition" number={s?.name}><button className="btn-primary">Save</button></FormHeader>
      <div className="px-4 pt-3">
        <ErrorBanner error={error} />
        <InfoBanner>Response SLAs stop when the record is assigned or leaves its initial state. Resolution SLAs stop when it is resolved or closed. Time in a pause state is excluded. Changes apply to records updated from now on.</InfoBanner>
      </div>
      <Grid>
        <TextField label="Name" name="name" defaultValue={s?.name} required />
        <ChoiceField label="Table" name="table" list="slaTable" value={s?.table ?? "incident"} />
        <ChoiceField label="Type" name="type" list="slaType" value={s?.type ?? "resolution"} />
        <TextField label="Duration (hours)" name="hours" type="number" step="0.25" defaultValue={s ? s.durationMinutes / 60 : 8} required />
        <Field label="Priorities (empty = all)">
          <div className="flex flex-wrap gap-3 pt-1.5">
            {CHOICES.priority.map((p) => (
              <label key={p.value} className="flex items-center gap-1"><input type="checkbox" name="priority" value={p.value} defaultChecked={cond.priority?.includes(p.value)} />{p.label}</label>
            ))}
          </div>
        </Field>
        <TextField label="Pause states" name="pauseStates" defaultValue={s?.pauseStates ?? "on_hold"} placeholder="on_hold" />
        <Field label="Active"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="mt-2 h-4 w-4" /></Field>
      </Grid>
    </form>
  );
}
