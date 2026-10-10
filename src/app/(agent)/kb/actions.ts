"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { attempt } from "@/lib/form-errors";
import { optStr, str } from "@/lib/list";
import { saveArticle, transitionArticle } from "@/lib/rules/knowledge";

export async function saveArticleAction(fd: FormData) {
  return save(fd, null);
}

/** Workflow buttons save the article and move it to the given state. */
export async function transitionArticleAction(to: string, fd: FormData) {
  return save(fd, to);
}

async function save(fd: FormData, to: string | null) {
  const user = await requireRole("itil", "knowledge_admin");
  const id = str(fd, "id") || null;
  const back = id ? `/kb/${id}` : "/kb/new";
  const a = await attempt(back, async () => {
    const saved = await saveArticle(id, {
      title: str(fd, "title"), body: str(fd, "body"), category: str(fd, "category") || "general",
      knowledgeBase: str(fd, "knowledgeBase") || "IT", keywords: optStr(fd, "keywords"),
    }, user);
    return to ? transitionArticle(saved.id, to, user) : saved;
  });
  revalidatePath("/kb");
  redirect(`/kb/${a.id}`);
}
