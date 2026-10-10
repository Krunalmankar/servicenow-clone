import { requireUser } from "@/lib/auth";
import { ApprovalList } from "@/components/ApprovalList";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function Approvals({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold text-sn-dark">My Approvals</h1>
      <ErrorBanner error={error} />
      <ApprovalList userId={user.id} back="/approvals" linkRecords />
    </div>
  );
}
