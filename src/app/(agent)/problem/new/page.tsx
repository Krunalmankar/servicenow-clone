import { requireRole } from "@/lib/auth";
import { FormHeader } from "@/components/Form";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createProblemAction } from "../actions";
import { ProblemFields } from "../ProblemForm";

export default async function NewProblem({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("itil");
  const { error } = await searchParams;
  return (
    <form action={createProblemAction} className="card">
      <FormHeader title="Problem"><button className="btn-primary">Submit</button></FormHeader>
      <div className="px-4 pt-3"><ErrorBanner error={error} /></div>
      <ProblemFields />
    </form>
  );
}
