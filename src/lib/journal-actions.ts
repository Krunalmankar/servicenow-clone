"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAgent } from "./auth";
import { addJournal } from "./audit";
import { str } from "./list";

export async function postJournal(formData: FormData) {
  const user = await requireUser();
  const type = str(formData, "type") === "work_notes" ? "work_notes" : "comments";
  if (type === "work_notes" && !isAgent(user)) throw new Error("Only agents can add work notes");
  await addJournal(str(formData, "table"), str(formData, "recordId"), type, str(formData, "body"), user.id);
  revalidatePath(str(formData, "path") || "/");
}
