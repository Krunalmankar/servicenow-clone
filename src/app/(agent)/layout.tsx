import { redirect } from "next/navigation";
import { requireUser, isAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import { Navigator } from "@/components/Navigator";
import { TopBar } from "@/components/TopBar";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isAgent(user) && !user.roles.includes("approver_user")) redirect("/portal");
  const pending = await db.approval.count({ where: { approverId: user.id, state: "requested" } });
  return (
    <div className="flex h-screen flex-col">
      <TopBar user={user} pendingApprovals={pending} />
      <div className="flex min-h-0 flex-1">
        <Navigator user={user} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
