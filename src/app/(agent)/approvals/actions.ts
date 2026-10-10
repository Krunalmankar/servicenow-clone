"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { decideApproval } from "@/lib/rules/approval";
import { str } from "@/lib/list";

export async function decideAction(decision: "approved" | "rejected", fd: FormData) {
  const user = await requireUser();
  const back = str(fd, "back") || "/approvals";
  await attempt(back, () => decideApproval(str(fd, "approvalId"), decision, str(fd, "comments"), user));
  revalidatePath(back);
}
