import { db } from "../db";
import { hasRole, type SessionUser } from "../roles";
import { nextNumber, PREFIX } from "../numbering";
import { auditChanges } from "../audit";

const ALLOWED: Record<string, string[]> = {
  draft: ["review"],
  review: ["published", "draft"],
  published: ["retired", "draft"],
  retired: ["draft"],
};

export async function saveArticle(id: string | null, data: { title: string; body: string; category: string; knowledgeBase: string; keywords: string | null }, user: SessionUser) {
  if (!data.title.trim() || !data.body.trim()) throw new Error("Title and article body are required");
  if (!id) {
    return db.knowledgeArticle.create({ data: { ...data, number: await nextNumber(PREFIX.kb_knowledge), authorId: user.id } });
  }
  const before = await db.knowledgeArticle.findUniqueOrThrow({ where: { id } });
  if (before.authorId !== user.id && !hasRole(user, "knowledge_admin")) throw new Error("Only the author or a knowledge admin can edit this article");
  const a = await db.knowledgeArticle.update({ where: { id }, data });
  await auditChanges("kb_knowledge", id, before, a, user, ["title", "category", "knowledgeBase"]);
  return a;
}

/** Knowledge lifecycle: Draft -> Review -> Published -> Retired. Publishing needs knowledge_admin. */
export async function transitionArticle(id: string, to: string, user: SessionUser) {
  const a = await db.knowledgeArticle.findUniqueOrThrow({ where: { id } });
  if (!ALLOWED[a.state]?.includes(to)) throw new Error(`Cannot move an article from ${a.state} to ${to}`);
  if ((to === "published" || to === "retired") && !hasRole(user, "knowledge_admin")) throw new Error("Only knowledge admins can publish or retire articles");
  const updated = await db.knowledgeArticle.update({
    where: { id }, data: { state: to, publishedAt: to === "published" ? new Date() : a.publishedAt },
  });
  await auditChanges("kb_knowledge", id, a, updated, user, ["state"]);
  return updated;
}

export async function searchArticles(q: string, take = 20) {
  const terms = q.trim().split(/\s+/).filter(Boolean);
  return db.knowledgeArticle.findMany({
    where: {
      state: "published",
      AND: terms.map((t) => ({ OR: [{ title: { contains: t } }, { body: { contains: t } }, { keywords: { contains: t } }] })),
    },
    orderBy: [{ views: "desc" }],
    take,
  });
}
