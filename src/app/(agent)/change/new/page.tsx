import { requireRole } from "@/lib/auth";
import { FormHeader } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createChangeAction } from "../actions";
import { ChangeFields } from "../ChangeForm";

export default async function NewChange({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { error } = await searchParams;
  return (
    <form action={createChangeAction} className="card">
      <FormHeader title="Change Request"><button className="btn-primary">Submit</button></FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <ChangeFields />
    </form>
  );
}
