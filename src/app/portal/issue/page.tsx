import { requireUser } from "@/lib/auth";
import { ciOptions } from "@/lib/refs";
import { CHOICES } from "@/lib/choices";
import { ErrorBanner } from "@/components/ErrorBanner";
import { KbSuggest } from "@/components/KbSuggest";
import { reportIssueAction } from "../actions";

export default async function ReportIssue({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const { error } = await searchParams;
  const services = (await ciOptions());
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-sn-dark">Report an Issue</h1>
      <p className="mb-6 text-sm text-gray-600">Tell us what is wrong and the Service Desk will pick it up.</p>
      <ErrorBanner error={error} />
      <form action={reportIssueAction} className="card space-y-4 p-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">What is the problem? <span className="text-red-600">*</span></span>
          <input name="shortDescription" className="input" required placeholder="e.g. Outlook keeps asking for my password" />
        </label>
        <KbSuggest inputName="shortDescription" />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Details</span>
          <textarea name="description" rows={5} className="input" placeholder="When did it start? What have you tried?" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select name="category" className="input">{CHOICES.incidentCategory.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">How urgent?</span>
            <select name="urgency" className="input" defaultValue="3">
              <option value="1">High – I can&apos;t work</option>
              <option value="2">Medium – work is impaired</option>
              <option value="3">Low – minor inconvenience</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Affected service</span>
            <select name="ciId" className="input"><option value="">Not sure</option>{services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </label>
        </div>
        <button className="btn-primary px-6 py-2">Submit</button>
      </form>
    </div>
  );
}
