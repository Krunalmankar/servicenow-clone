import { requireRole } from "@/lib/auth";
import { FormHeader } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createIncidentAction } from "../actions";
import { IncidentFields } from "../IncidentForm";

export default async function NewIncident({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("itil");
  const { error } = await searchParams;
  return (
    <form action={createIncidentAction} className="card">
      <FormHeader title="Incident">
        <button className="btn-primary">Submit</button>
      </FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <IncidentFields defaultCallerId={user.id} />
    </form>
  );
}
