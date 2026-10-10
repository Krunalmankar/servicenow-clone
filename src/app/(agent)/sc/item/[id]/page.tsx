import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { groupOptions } from "@/lib/refs";
import { Field, FormHeader, Grid, RefField, TextArea, TextField } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { saveItemAction } from "../../actions";

const EXAMPLE = `[{"name":"os","label":"Operating system","type":"select","options":["Windows 11","macOS"],"required":true}]`;

export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole("catalog_admin");
  const { id } = await params;
  const { error } = await searchParams;
  const item = id === "new" ? null : await db.catalogItem.findUnique({ where: { id } });
  if (id !== "new" && !item) notFound();
  const [categories, groups] = await Promise.all([
    db.catalogCategory.findMany({ orderBy: { order: "asc" } }).then((c) => c.map((x) => ({ id: x.id, label: x.name }))),
    groupOptions(),
  ]);
  const tasks = item ? (JSON.parse(item.taskTemplates) as string[]).join("\n") : "";
  return (
    <form action={saveItemAction} className="card">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <FormHeader title="Catalog Item" number={item?.name}><button className="btn-primary">Save</button></FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <Grid>
        <TextField label="Name" name="name" defaultValue={item?.name} required />
        <RefField label="Category" name="categoryId" options={categories} value={item?.categoryId} required />
        <TextField label="Short description" name="shortDescription" defaultValue={item?.shortDescription} required />
        <RefField label="Fulfilment group" name="fulfillmentGroupId" options={groups} value={item?.fulfillmentGroupId} />
        <TextField label="Price ($)" name="price" type="number" step="0.01" defaultValue={item?.price ?? 0} />
        <TextField label="Delivery (days)" name="deliveryDays" type="number" defaultValue={item?.deliveryDays ?? 3} />
        <Field label="Manager approval"><input type="checkbox" name="requiresApproval" defaultChecked={item?.requiresApproval} className="mt-2 h-4 w-4" /></Field>
        <Field label="Active"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="mt-2 h-4 w-4" /></Field>
        <TextArea label="Description" name="description" rows={3} defaultValue={item?.description ?? ""} />
        <TextArea label="Variables (JSON)" name="variables" rows={6} defaultValue={item?.variables ?? "[]"} placeholder={EXAMPLE} className="input font-mono text-xs" />
        <TextArea label="Fulfilment tasks (one per line)" name="taskTemplates" rows={3} defaultValue={tasks} />
      </Grid>
    </form>
  );
}
