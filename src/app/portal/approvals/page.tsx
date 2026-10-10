import { requireUser } from "@/lib/auth";
import { ApprovalList } from "@/components/ApprovalList";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function PortalApprovals({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-sn-dark">My Approvals</h1>
      <ErrorBanner error={error} />
      <ApprovalList userId={user.id} back="/portal/approvals" linkRecords={false} />
    </div>
  );
}
